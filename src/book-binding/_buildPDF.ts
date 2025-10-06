import { join, dirname, fromFileUrl } from "@std/path";

import { getImageSrcList } from "../util.ts";

const __dirname = dirname(fromFileUrl(import.meta.url));

const ROOT_PATH = join(__dirname, "..", "..");
Deno.mkdirSync("tmp", {recursive: true});
const TMP_DIR_REL = Deno.makeTempDirSync({prefix: "pdfBuild-", dir: "tmp"});
const TMP_DIR = join(ROOT_PATH, TMP_DIR_REL);
const SITEDATA = JSON.parse(Deno.readTextFileSync(join(ROOT_PATH, "_data", "sitedata.json")));
const FULLMD_PATH = join(ROOT_PATH, "_site", "downloads", `${SITEDATA.title.replaceAll(" ", "")}.md`);
const PDF_DATA_PATH = join(ROOT_PATH, "pubs", "typst");
const PDF_TARGET_DIR = join(ROOT_PATH, "static", "downloads");
Deno.mkdirSync(PDF_TARGET_DIR, {recursive: true});
const PDF_OUTPUT_FILENAME = `${SITEDATA.title.replaceAll(" ", "")}.pdf`;

function _fixTables(stream: Uint8Array<ArrayBuffer>): Uint8Array<ArrayBuffer> {
	let text = new TextDecoder().decode(stream);

	// change header lower line to 0.6pt
	text = text.replace(
		/(table\.header\([^)]*\),)\s*table\.hline\(\)/g,
		`$1\n    table.hline(stroke: 0.6pt)`
	);

	// add a 1pt line above the header
	text = text.replace(
		/(table\.header\([^)]*\),)/g,
		`table.hline(stroke: 1pt),\n    $1`
	);

	// add line at bottom of table
	text = text.replace(
		/(#table\([\S\s]*?\],\s*)(\n\s*\)\])/g,
		`$1\n    table.hline(stroke: 1pt),$2`
	);

	// inset the last row
	text = text.replace(
		/(#table\([\S\s]*?\s*)(.*?,\n\s*table.hline\(stroke: 1pt\),\n\s*\)\])/g,
		`$1table.cell(inset: (top: 4pt, bottom: 7.5pt))$2`
	);

	return new TextEncoder().encode(text);
}

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

	const imgSrcList = await getImageSrcList(actualContent);
	if (!imgSrcList) {
		return false;
	}

	console.log("PDF Build: Prepping image links...");
	imgSrcList.forEach((src) => {
		if (src.startsWith("/")) {
			actualContent = actualContent.replaceAll(src, `/static${src}`);
		}
	});

	// split the preliminaries away from the rest of the book
	const header = Deno.readFileSync(join(PDF_DATA_PATH, "config", "_header.typ"));
	const secondSplit = actualContent.indexOf("\n## ");
	const prelims = actualContent.slice(0, secondSplit);
	const mainContent = actualContent.slice(secondSplit);

	const PANDOC_ARGS = [
		"--from", "markdown+implicit_header_references-implicit_figures",
		"--to", "typst",
		"--shift-heading-level-by=-1",
		"--top-level-division", "part",
		"--syntax-highlighting", "pygments",
		"--lua-filter", join(ROOT_PATH, "src", "pandocFilters", "typstFilters.lua"),
		"--syntax-definition", join("resources", "syntax-highlighting", "pymod", "pymod.xml"),
	];

	console.log("PDF Build: Generating Typst files...");
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
		const outPath = join(PDF_DATA_PATH, "srcs", "prelims.typ");
		Deno.writeFileSync(outPath, header);
		Deno.writeFileSync(outPath, _fixTables(prelimTexResult.stdout), {append: true});
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
		const outPath = join(PDF_DATA_PATH, "srcs", "main.typ");
		Deno.writeFileSync(outPath, header);
		Deno.writeFileSync(outPath, _fixTables(mainTexResult.stdout), {append: true});
	}

	console.log("PDF Build: Building PDF from Typst files...");
	const typstProc = new Deno.Command("typst", {
		args: [
			"compile",
			"--root", ROOT_PATH,
			"--ignore-system-fonts",
			"--font-path", join(PDF_DATA_PATH, "fonts"),
			join(PDF_DATA_PATH, "full.typ"),
			join(PDF_TARGET_DIR, PDF_OUTPUT_FILENAME)
		],
	});
	const typstResult = await typstProc.output();
	if (!typstResult.success) {
		console.error(`TYPST ERROR: ${new TextDecoder().decode(typstResult.stderr)}`);
		return false;
	}

	console.log("PDF Build: Adding cover...");
	const pdfMetaProc = new Deno.Command("pdftk", {
		args: [
			join(PDF_TARGET_DIR, PDF_OUTPUT_FILENAME),
			"dump_data",
		]
	});
	const pdfMetaResult = await pdfMetaProc.output();
	if (!pdfMetaResult.success) {
		console.error(`PDFTK ERROR: ${new TextDecoder().decode(pdfMetaResult.stderr)}`);
		return false;
	}

	const originalMetadata = new TextDecoder().decode(pdfMetaResult.stdout);
	const labelsOff = originalMetadata.split("\n").filter(ln => ln.startsWith("PageLabel")).join("\n");
	const labelsFixed = labelsOff.replace(
		/^PageLabelNewIndex:\s*(\d+)$/gm,
		(_, numStr) => {
			const num = parseInt(numStr);
			return `PageLabelNewIndex: ${num === 1 ? 1 : num + 1}`;
		}
	);
	Deno.writeTextFileSync(join(TMP_DIR, "pdf_metadata.txt"), labelsFixed);

	const pdfTkProc = new Deno.Command("pdftk", {
		args: [
			join(ROOT_PATH, "resources", "demo-assets", "fakeCoverBig.pdf"),
			join(PDF_TARGET_DIR, PDF_OUTPUT_FILENAME),
			"cat",
			"output",
			join(TMP_DIR, "with_cover.pdf"),
		],
	});
	const pdfTkResult = await pdfTkProc.output();
	if (!pdfTkResult.success) {
		console.error(`PDFTK ERROR: ${new TextDecoder().decode(pdfTkResult.stderr)}`);
		return false;
	}

	const pdfMetaFixProc = new Deno.Command("pdftk", {
		args: [
			join(TMP_DIR, "with_cover.pdf"),
			"update_info",
			join(TMP_DIR, "pdf_metadata.txt"),
			"output",
			join(TMP_DIR, "final.pdf"),
		]
	});
	const pdfMetaFixResult = await pdfMetaFixProc.output();
	if (!pdfMetaResult.success) {
		console.error(`PDFTK ERROR: ${new TextDecoder().decode(pdfMetaFixResult.stderr)}`);
		return false;
	}

	Deno.copyFileSync(
		join(TMP_DIR, "final.pdf"),
		join(PDF_TARGET_DIR, PDF_OUTPUT_FILENAME)
	);


	console.log("PDF Build: Cleaning up...");
	Deno.removeSync(TMP_DIR, {recursive: true});
	return true;
};

if (import.meta.main) {
	await main() ? Deno.exit(0) : Deno.exit(1);
}
