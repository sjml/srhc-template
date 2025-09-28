import { join, dirname, fromFileUrl } from "@std/path";

import { parse, stringify } from "@libs/xml";

const __dirname = dirname(fromFileUrl(import.meta.url));

const ROOT_PATH = join(__dirname, "..", "..");
Deno.mkdirSync("tmp", {recursive: true});
const TMP_DIR_REL = Deno.makeTempDirSync({prefix: "kindleBuild-", dir: "tmp"});
const TMP_DIR = join(ROOT_PATH, TMP_DIR_REL);
const SITEDATA = JSON.parse(Deno.readTextFileSync(join(ROOT_PATH, "_data", "sitedata.json")));
const KINDLE_TARGET_DIR = join(ROOT_PATH, "static", "downloads");
Deno.mkdirSync(KINDLE_TARGET_DIR, {recursive: true});
const OUTPUT_BASENAME = SITEDATA.title.replaceAll(" ", "");
const EPUB_OUTPUT_FILENAME = `${OUTPUT_BASENAME}.epub`;
const KINDLE_WORKING_DIR = join(TMP_DIR, `${OUTPUT_BASENAME}_epub`);

export default function main(): boolean {
	console.log("Kindle Build: Unzipping ePUB file...");
	const unzipCmd = new Deno.Command("unzip", {
		args: [
			"-d", KINDLE_WORKING_DIR,
			join(KINDLE_TARGET_DIR, EPUB_OUTPUT_FILENAME),
		],
		stderr: "piped",
	});
	const unzipResult = unzipCmd.outputSync();
	if (!unzipResult.success) {
		console.error(`UNZIP ERROR: ${new TextDecoder().decode(unzipResult.stderr)}`);
		return false;
	}

	console.log("Kindle Build: Modifying for Kindle...");
	Deno.copyFileSync(
		join(ROOT_PATH, "_site", "css", "srhc-kindle.css"),
		join(KINDLE_WORKING_DIR, "EPUB", "styles", "stylesheet1.css")
	);

	// edit the book's index to include licensing and title pages
	const opfPath = join(KINDLE_WORKING_DIR, "EPUB", "content.opf");
	const opfDataStr = Deno.readTextFileSync(opfPath);
	const opfDoc = parse(opfDataStr);

	for (const fontFile of Deno.readDirSync(join(KINDLE_WORKING_DIR, "EPUB", "fonts"))) {
		const pathTo = join("fonts", fontFile.name);
		Deno.removeSync(join(KINDLE_WORKING_DIR, "EPUB", pathTo));
		const idx = opfDoc.package.manifest.item.findIndex((item: {"@href"?: string}) => item["@href"] === pathTo);
		if (idx === -1) {
			console.error(`XML ERROR: could not find item with @href '${pathTo}'`);
			return false;
		}
		opfDoc.package.manifest.item.splice(idx, 1);
	}

	const opfOutput = stringify(opfDoc, {
		format: {
			indent: "\t",
		},
	});
	Deno.writeTextFileSync(opfPath, opfOutput);

	console.log("Kindle Build: Re-zipping...");
	const zipMTCmd = new Deno.Command("zip", {
		args: [
			"-0", // the mimetype has to be stored directly
			"-X", // no extra file attributes or something?
			"-q", // ssssshhhhhhhh
			join(TMP_DIR, EPUB_OUTPUT_FILENAME),
			"mimetype",
		],
		cwd: KINDLE_WORKING_DIR,
		stderr: "piped",
		stdout: "piped",
	});
	const zipMTResult = zipMTCmd.outputSync();
	if (!zipMTResult.success) {
		console.error(`ZIP MIMETYPE ERROR: ${new TextDecoder().decode(zipMTResult.stdout)}`);
		return false;
	}

	const zipRestCmd = new Deno.Command("zip", {
		args: [
			"-9", // high compression
			"-X", // no extra file attributes or something?
			"-r", // recursive
			"-D", // no directory entries
			"-q", // ssssshhhhhhhh
			join(TMP_DIR, EPUB_OUTPUT_FILENAME),
			"EPUB", "META-INF",
		],
		cwd: KINDLE_WORKING_DIR,
		stderr: "piped",
		stdout: "piped",
	});
	const zipRestResult = zipRestCmd.outputSync();
	if (!zipRestResult.success) {
		console.error(`ZIP REST ERROR: ${new TextDecoder().decode(zipRestResult.stdout)}`);
		return false;
	}

	console.log("Kindle Build: Validating intermediate output...");
	const epubCheckCmd = new Deno.Command("epubcheck", {
		args: [
			"--failonwarnings", "--warn", "--quiet",
			join(TMP_DIR, EPUB_OUTPUT_FILENAME),
		],
	});
	const epubCheckResult = epubCheckCmd.outputSync();
	if (!epubCheckResult.success) {
		console.error(`EPUBCHECK ERROR: ${new TextDecoder().decode(epubCheckResult.stderr)}`);
		return false;
	}

	console.log("Kindle Build: Converting to azw3...");
	const azw3Cmd = new Deno.Command("ebook-convert", {
		args: [
			join(TMP_DIR, EPUB_OUTPUT_FILENAME),
			join(TMP_DIR, `${OUTPUT_BASENAME}.azw3`)
		],
		stdout: "piped",
		stderr: "piped",
	});
	const azw3Result = azw3Cmd.outputSync();
	if (!azw3Result.success) {
		console.error(`EBOOK-CONVERT ERROR: ${new TextDecoder().decode(azw3Result.stderr)}`);
		return false;
	}
	else {
		let problem = false;
		new TextDecoder().decode(azw3Result.stdout).split("\n").forEach(line => {
			if (line.match(/Warning|Error/)) {
				console.warn(line);
				problem = true;
			}
		});
		if (problem) {
			return false;
		}
	}

	console.log("Kindle Build: Converting to mobi...");
	const mobiCmd = new Deno.Command("ebook-convert", {
		args: [
			join(TMP_DIR, EPUB_OUTPUT_FILENAME),
			join(TMP_DIR, `${OUTPUT_BASENAME}.mobi`)
		],
		stdout: "piped",
		stderr: "piped",
	});
	const mobiResult = mobiCmd.outputSync();
	if (!mobiResult.success) {
		console.error(`EBOOK-CONVERT ERROR: ${new TextDecoder().decode(mobiResult.stderr)}`);
		return false;
	}
	else {
		let problem = false;
		new TextDecoder().decode(mobiResult.stdout).split("\n").forEach(line => {
			if (line.match(/Warning|Error/)) {
				console.warn(line);
				problem = true;
			}
		});
		if (problem) {
			return false;
		}
	}

	console.log("Kindle Build: Cleaning up...");
	Deno.renameSync(
		join(TMP_DIR, `${OUTPUT_BASENAME}.azw3`),
		join(KINDLE_TARGET_DIR, `${OUTPUT_BASENAME}.azw3`)
	);
	Deno.renameSync(
		join(TMP_DIR, `${OUTPUT_BASENAME}.mobi`),
		join(KINDLE_TARGET_DIR, `${OUTPUT_BASENAME}.mobi`)
	);

	Deno.removeSync(TMP_DIR, {recursive: true});

	return true;
}

if (import.meta.main) {
	main() ? Deno.exit(0) : Deno.exit(1);
}
