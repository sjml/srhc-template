import { join, dirname, fromFileUrl } from "@std/path";

import { parse, stringify } from "@libs/xml";

import { getImageSrcList } from "../util.ts";

const __dirname = dirname(fromFileUrl(import.meta.url));

const ROOT_PATH = join(__dirname, "..", "..");
Deno.mkdirSync("tmp", {recursive: true});
const TMP_DIR_REL = Deno.makeTempDirSync({prefix: "epubBuild-", dir: "tmp"});
const TMP_DIR = join(ROOT_PATH, TMP_DIR_REL);
const SITEDATA = JSON.parse(Deno.readTextFileSync(join(ROOT_PATH, "_data", "sitedata.json")));
const FULLMD_PATH = join(ROOT_PATH, "_site", "downloads", `${SITEDATA.title.replaceAll(" ", "")}.md`);
const EPUB_DATA_PATH = join(ROOT_PATH, "pubs", "epub");
const EPUB_TARGET_DIR = join(ROOT_PATH, "static", "downloads");
Deno.mkdirSync(EPUB_TARGET_DIR, {recursive: true});
const EPUB_OUTPUT_BASENAME = SITEDATA.title.replaceAll(" ", "");
const EPUB_OUTPUT_FILENAME = `${EPUB_OUTPUT_BASENAME}.epub`;
const EPUB_WORKING_DIR = join(TMP_DIR, `${EPUB_OUTPUT_BASENAME}_epub`);

export default async function main(): Promise<boolean> {
	let fullMD;
	try {
		fullMD = Deno.readTextFileSync(FULLMD_PATH);
	}
	catch (_) {
		console.error("ERROR: full markdown file doesn't exist. Need to build the site?");
		return false;
	}

	console.log("ePUB Build: Prepping Markdown sources from built site...");

	// strip off all the standalone markdown frontmatter
	const hrSplits = fullMD.split("\n----\n");
	let actualContent = hrSplits.slice(2).join("\n----\n");

	// could do some of this with a JSON filter in here but less code == better code
	const imgSrcList = await getImageSrcList(actualContent);
	if (!imgSrcList) {
		return false;
	}
	console.log("ePUB Build: Prepping image links and converting SVGs...");
	imgSrcList.forEach((src) => {
		const clean = src.split("?v=")[0];
		if (clean.endsWith(".svg")) {
			const outSrc = `${clean.slice(0, -4)}.png`;
			const outPath = join(TMP_DIR, outSrc);
			Deno.mkdirSync(dirname(outPath), {recursive: true});
			const convCmd = new Deno.Command("rsvg-convert", {
				args: [
					"--keep-aspect-ratio",
					"--width", "2048",
					"--format", "png",
					"--output", outPath,
					join(ROOT_PATH, "static", clean),
				],
				stdout: "piped",
				stderr: "piped",
			});
			const convProcResult = convCmd.outputSync();
			if (!convProcResult.success) {
				console.error(`RSVG-CONVERT ERROR: ${new TextDecoder().decode(convProcResult.stderr)}`);
				return false;
			}
			actualContent = actualContent.replaceAll(src, outPath);
		}
		else if (src.startsWith("/")) {
			actualContent = actualContent.replaceAll(src, join(Deno.cwd(), join(ROOT_PATH, "static", src)));
		}
	});
	Deno.writeTextFileSync(join(TMP_DIR, "content.md"), actualContent);

	console.log("ePUB Build: Running Pandoc...");
	const PANDOC_ARGS = [
		"--from", "markdown+implicit_header_references-implicit_figures",
		"--to", "epub3",
		"--epub-cover-image", join(ROOT_PATH, "resources", "demo-assets", "fakeCoverBig.jpg"),
		"--epub-title-page=false",
		"--css", join(ROOT_PATH, "_site", "css", "srhc-epub.css"),
		"--variable", "highlighting-css=", // keeps pandoc from inserting its own CSS in the rendered files
		`--epub-embed-font=${join(ROOT_PATH, "resources", "fonts", "Alegreya", "static", "Alegreya-Regular.woff2")}`,
		`--epub-embed-font=${join(ROOT_PATH, "resources", "fonts", "Alegreya", "static", "Alegreya-Italic.woff2")}`,
		`--epub-embed-font=${join(ROOT_PATH, "resources", "fonts", "Alegreya", "static", "Alegreya-Bold.woff2")}`,
		`--epub-embed-font=${join(ROOT_PATH, "resources", "fonts", "Alegreya", "static", "Alegreya-BlackItalic.woff2")}`,
		`--epub-embed-font=${join(ROOT_PATH, "resources", "fonts", "Alegreya", "static", "Alegreya-Black.woff2")}`,
		`--epub-embed-font=${join(ROOT_PATH, "resources", "fonts", "CascadiaMono", "static", "CascadiaMono-SemiLight.woff2")}`,
		`--epub-embed-font=${join(ROOT_PATH, "resources", "fonts", "CascadiaMono", "static", "CascadiaMono-SemiLightItalic.woff2")}`,
		`--epub-embed-font=${join(ROOT_PATH, "resources", "fonts", "CascadiaMono", "static", "CascadiaMono-Bold.woff2")}`,
		`--epub-embed-font=${join(ROOT_PATH, "resources", "fonts", "CascadiaMono", "static", "CascadiaMono-BoldItalic.woff2")}`,
		`--epub-embed-font=${join(ROOT_PATH, "resources", "fonts", "DavidLibre", "DavidLibre-Regular.woff2")}`,
		`--epub-embed-font=${join(ROOT_PATH, "resources", "fonts", "DavidLibre", "DavidLibre-Medium.woff2")}`,
		"--shift-heading-level-by=-1",
		"--top-level-division", "part",
		"--syntax-highlighting", "pygments",
		"--syntax-definition", join(ROOT_PATH, "resources", "syntax-highlighting", "pymod", "pymod.xml"),
		"--toc",
		"--toc-depth", "2",
		"--split-level", "2",
		"--output", join(TMP_DIR, EPUB_OUTPUT_FILENAME),
		"./pubs/epub/metadata.md",
		join(TMP_DIR, "content.md")
	];

	const pandocCmd = new Deno.Command("pandoc", {
		args: PANDOC_ARGS,
		stdout: "piped",
		stderr: "piped",
	});
	const pandocResult = pandocCmd.outputSync();
	if (!pandocResult.success) {
		console.error(`PANDOC ERROR: ${new TextDecoder().decode(pandocResult.stderr)}`);
		return false;
	}
	else {
		const pandocStdErr = new TextDecoder().decode(pandocResult.stderr).trim();
		if (pandocStdErr.length > 0) {
			console.warn(pandocStdErr);
		}
	}

	console.log("ePUB Build: Patching output file...");
	const unzipCmd = new Deno.Command("unzip", {
		args: [
			"-d", EPUB_WORKING_DIR,
			join(TMP_DIR, EPUB_OUTPUT_FILENAME),
		],
		stderr: "piped",
	});
	const unzipResult = unzipCmd.outputSync();
	if (!unzipResult.success) {
		console.error(`UNZIP ERROR: ${new TextDecoder().decode(unzipResult.stderr)}`);
		return false;
	}

	// grab title page image out of sibling PDF
	const extractCmd = new Deno.Command("gs", {
		args: [
			"-dSAFER", "-dQUIET", "-dNOPLATFONTS", "-dNOPAUSE", "-dBATCH",
			`-sOutputFile=${join(EPUB_WORKING_DIR, "EPUB", "media", "titlepage.png")}`,
			"-sDEVICE=pngalpha",
			"-r300",
			"-dTextAlphaBits=4",
			"-dGraphicsAlphaBits=4",
			"-dUseCIEColor",
			"-dUseTrimBox",
			"-dFirstPage=2",
			"-dLastPage=2",
			join(EPUB_TARGET_DIR, `${EPUB_OUTPUT_BASENAME}.pdf`)
		],
		stderr: "piped",
	});
	const extractResult = extractCmd.outputSync();
	if (!extractResult.success) {
		console.error(`GHOSTSCRIPT ERROR: ${new TextDecoder().decode(extractResult.stderr)}`);
		return false;
	}

	const resizeProc = new Deno.Command("convert", {
		args: [
			join(EPUB_WORKING_DIR, "EPUB", "media", "titlepage.png"),
			"-trim",
			"-scale", "50%",
			"-bordercolor", "transparent",
			"-border", "100x50",
			// "-alpha", "remove",
			join(EPUB_WORKING_DIR, "EPUB", "media", "titlepage.png"),
		],
		stdout: "piped",
		stderr: "piped",
	});
	const resizeResult = resizeProc.outputSync();
	if (!resizeResult.success) {
		console.error(`IMAGEMAGICK ERROR: ${new TextDecoder().decode(resizeResult.stderr)} \nstdout: ${new TextDecoder().decode(resizeResult.stdout)}`);
		return false;
	}

	// grab licensing images and pre-made page sources
	Deno.copyFileSync(
		join(ROOT_PATH, "resources", "licensing", "by-nc-sa.png"),
		join(EPUB_WORKING_DIR, "EPUB", "media", "by-nc-sa.png")
	);
	Deno.copyFileSync(
		join(EPUB_DATA_PATH, "srcs", "rights.xhtml"),
		join(EPUB_WORKING_DIR, "EPUB", "text", "rights.xhtml")
	);
	Deno.copyFileSync(
		join(EPUB_DATA_PATH, "srcs", "titlepage.xhtml"),
		join(EPUB_WORKING_DIR, "EPUB", "text", "titlepage.xhtml")
	);

	// edit the book's index to include licensing and title pages
	const opfPath = join(EPUB_WORKING_DIR, "EPUB", "content.opf");
	const opfDataStr = Deno.readTextFileSync(opfPath);
	const opfDoc = parse(opfDataStr);
	// deno-lint-ignore no-explicit-any
	const manifest = (opfDoc as any).package.manifest;
	[
		["text/rights.xhtml", "rights_xhtml"],
		["text/titlepage.xhtml", "titlepage_xhtml"],
	].forEach(([fpath, fid]) => {
		manifest.item.push({
			"@id": fid,
			"@href": fpath,
			"@media-type": "application/xhtml+xml",
			...(fid === "titlepage_xhtml" ? { "@properties": "svg" } : {})
		});
	});

	manifest.item.push({
		"@id": "titlepage_png",
		"@href": "media/titlepage.png",
		"@media-type": "image/png",
	});
	manifest.item.push({
		"@id": "by-nc-sa_png",
		"@href": "media/by-nc-sa.png",
		"@media-type": "image/png",
	});

	// deno-lint-ignore no-explicit-any
	const spine = (opfDoc as any).package.spine;
	spine.itemref.splice(1, 0, {
		"@idref": "rights_xhtml",
	});
	spine.itemref.splice(1, 0, {
		"@idref": "titlepage_xhtml",
	});

	const opfOutput = stringify(opfDoc, {
		format: {
			indent: "\t",
		},
	});
	Deno.writeTextFileSync(opfPath, opfOutput);

	console.log("ePUB Build: Re-zipping...");
	Deno.removeSync(join(TMP_DIR, EPUB_OUTPUT_FILENAME));
	const zipMTCmd = new Deno.Command("zip", {
		args: [
			"-0", // the mimetype has to be stored directly
			"-X", // no extra file attributes or something?
			"-q", // ssssshhhhhhhh
			join(TMP_DIR, EPUB_OUTPUT_FILENAME),
			"mimetype",
		],
		cwd: EPUB_WORKING_DIR,
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
		cwd: EPUB_WORKING_DIR,
		stderr: "piped",
		stdout: "piped",
	});
	const zipRestResult = zipRestCmd.outputSync();
	if (!zipRestResult.success) {
		console.error(`ZIP REST ERROR: ${new TextDecoder().decode(zipRestResult.stdout)}`);
		return false;
	}

	console.log("ePUB Build: Validating final output...");
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

	console.log("ePUB Build: Cleaning up...");
	Deno.renameSync(
		join(TMP_DIR, EPUB_OUTPUT_FILENAME),
		join(EPUB_TARGET_DIR, EPUB_OUTPUT_FILENAME)
	);

	Deno.removeSync(TMP_DIR, {recursive: true});

	return true;
}

if (import.meta.main) {
	await main() ? Deno.exit(0) : Deno.exit(1);
}
