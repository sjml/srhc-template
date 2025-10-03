import { join, dirname, fromFileUrl, relative } from "@std/path";

const __dirname = dirname(fromFileUrl(import.meta.url));

const ROOT_PATH = join(__dirname, "..", "..");
Deno.mkdirSync("tmp", {recursive: true});
const TMP_DIR_REL = Deno.makeTempDirSync({prefix: "pdfBuild-", dir: "tmp"});
const TMP_DIR = join(ROOT_PATH, TMP_DIR_REL);
const SITEDATA = JSON.parse(Deno.readTextFileSync(join(ROOT_PATH, "_data", "sitedata.json")));
const FULLMD_PATH = join(ROOT_PATH, "_site", "downloads", `${SITEDATA.title.replaceAll(" ", "")}.md`);
const PDF_DATA_PATH = join(ROOT_PATH, "pubs", "pdf");
const PDF_TARGET_DIR = join(ROOT_PATH, "static", "downloads");
Deno.mkdirSync(PDF_TARGET_DIR, {recursive: true});
const PDF_OUTPUT_FILENAME = `${SITEDATA.title.replaceAll(" ", "")}.pdf`;


export default async function main(): Promise<boolean> {
	let fullMD;
	try {
		fullMD = Deno.readTextFileSync(FULLMD_PATH);
	}
	catch (_) {
		console.error("ERROR: full markdown file doesn't exist. Need to build the site?");
		return false;
	}

	console.log("PDF Build: Prepping Markdown sources from built site...");

	// take off everything leading up to the first actual chapter
	//   (including the name of the first section which is probably
	//    just something like "Preliminaries")
	const firstSplit = fullMD.indexOf("\n### ");
	let actualContent = fullMD.slice(firstSplit);

	// could do some of this with a JSON filter in here but less code == better code
	const imgSrcListCmd = new Deno.Command("pandoc", {
		args: [
			"--from", "markdown+implicit_header_references-implicit_figures",
			"--to", "json", // dummy output
			"--lua-filter", join(ROOT_PATH, "src", "pandocFilters", "getImageList.lua"),
			"-o", "/dev/null"
		],
		stdin: "piped",
		stdout: "piped",
		stderr: "piped",
	});
	const imgSrcList = imgSrcListCmd.spawn();
	const imgSrcListWriter = imgSrcList.stdin.getWriter();
	await imgSrcListWriter.write(new TextEncoder().encode(actualContent));
	await imgSrcListWriter.close();
	const imgSrcListResult = await imgSrcList.output();
	if (!imgSrcListResult.success) {
		console.error(`PANDOC ERROR: ${new TextDecoder().decode(imgSrcListResult.stderr)}`);
		return false;
	}

	console.log("PDF Build: Prepping image links and converting SVGs...");
	new TextDecoder().decode(imgSrcListResult.stdout).split("\n").forEach((src) => {
		const clean = src.split("?v=")[0];
		if (clean.endsWith(".svg")) {
			const outSrc = `${clean.slice(0, -4)}.pdf`;
			const outPath = join(TMP_DIR, outSrc);
			Deno.mkdirSync(dirname(outPath), {recursive: true});
			const convCmd = new Deno.Command("rsvg-convert", {
				args: [
					"--keep-aspect-ratio",
					"--format", "pdf1.5",
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
			const relFilePath = join("../../", relative(".", outPath));
			actualContent = actualContent.replaceAll(src, relFilePath);
		}
		else if (src.startsWith("/")) {
			actualContent = actualContent.replaceAll(src, join(Deno.cwd(), join(ROOT_PATH, "static", src)));
		}
	});

	// split the preliminaries away from the rest of the book
	const secondSplit = actualContent.indexOf("\n## ");
	const prelims = actualContent.slice(0, secondSplit);
	const mainContent = actualContent.slice(secondSplit);

	const PANDOC_ARGS = [
		"--from", "markdown+implicit_header_references-implicit_figures",
		"--to", "latex",
		"--shift-heading-level-by=-1",
		"--top-level-division", "part",
		"--syntax-highlighting", "pygments",
		"--lua-filter", join(ROOT_PATH, "src", "pandocFilters", "latexFilters.lua"),
		"--syntax-definition", join("resources", "syntax-highlighting", "pymod", "pymod.xml"),
	];

	console.log("PDF Build: Generating TeX files...");
	const prelimTexCmd = new Deno.Command("pandoc", {
		args: PANDOC_ARGS,
		stdin: "piped",
		stdout: "piped",
		stderr: "piped",
	});
	const prelimTex = prelimTexCmd.spawn();
	const prelimTexWriter = prelimTex.stdin.getWriter();
	await prelimTexWriter.write(new TextEncoder().encode(prelims));
	await prelimTexWriter.close();
	const prelimTexResult = await prelimTex.output();
	if (!prelimTexResult.success) {
		console.error(`PANDOC ERROR: ${new TextDecoder().decode(prelimTexResult.stderr)}`);
		return false;
	}
	else {
		Deno.writeFileSync(
			join(PDF_DATA_PATH, "srcs", "prelims.tex"),
			prelimTexResult.stdout
		);
	}

	const mainTexCmd = new Deno.Command("pandoc", {
		args: PANDOC_ARGS,
		stdin: "piped",
		stdout: "piped",
		stderr: "piped",
	});
	const mainTex = mainTexCmd.spawn();
	const mainTexWriter = mainTex.stdin.getWriter();
	await mainTexWriter.write(new TextEncoder().encode(mainContent));
	await mainTexWriter.close();
	const mainTexResult = await mainTex.output();
	if (!mainTexResult.success) {
		console.error(`PANDOC ERROR: ${new TextDecoder().decode(mainTexResult.stderr)}`);
		return false;
	}
	else {
		Deno.writeFileSync(
			join(PDF_DATA_PATH, "srcs", "main.tex"),
			mainTexResult.stdout
		);
	}

	console.log("PDF Build: Building PDF from TeX files...");
	const tectonicProc = new Deno.Command("tectonic", {
		args: [
			"--outfmt", "pdf",
			join(PDF_DATA_PATH, "full.tex")
		],
	});
	const tectonicResult = await tectonicProc.output();
	function logErrFilter(log: string) {
		const tectonicErrStrings = [
			"Missing character",
			"accessing absolute path",
		];
		const errStrings = log.split("\n").filter(line =>
			tectonicErrStrings.some(err => line.includes(err))
		);
		if (errStrings.length == 0) {
			return null;
		}
		return errStrings;
	}
	const tectonicStdErr = new TextDecoder().decode(tectonicResult.stderr);
	const errStrings = logErrFilter(tectonicStdErr);
	if (!tectonicResult.success) {
		console.error(`TECTONIC ERROR: ${tectonicStdErr}`);
		const timestamp = new Date().toISOString();
		Deno.writeFileSync(
			join(ROOT_PATH, "tmp", `tectonic-log-${timestamp}.txt`),
			tectonicResult.stderr
		);
		return false;
	}
	else if (errStrings) {
		errStrings.forEach(line => console.error(line));
		const timestamp = new Date().toISOString();
		Deno.writeFileSync(
			join(ROOT_PATH, "tmp", `tectonic-log-${timestamp}.txt`),
			tectonicResult.stderr
		);
		return false;
	}
	else {
		Deno.renameSync(
			join(PDF_DATA_PATH, "full.pdf"),
			join(PDF_TARGET_DIR, PDF_OUTPUT_FILENAME)
		);
		// const timestamp = new Date().toISOString();
		// Deno.writeFileSync(
		// 	join(ROOT_PATH, "tmp", `tectonic-log-${timestamp}.txt`),
		// 	tectonicOutput.stderr
		// );
	}

	console.log("PDF Build: Cleaning up...");
	Deno.removeSync(TMP_DIR, {recursive: true});
	return true;
};

if (import.meta.main) {
	await main() ? Deno.exit(0) : Deno.exit(1);
}
