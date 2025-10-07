import { join, dirname, fromFileUrl } from "@std/path";

import { getImageSrcList } from "../util.ts";
import { getRevisionString } from "../getRevisionInfo.ts";

const __dirname = dirname(fromFileUrl(import.meta.url));

const ROOT_PATH = join(__dirname, "..", "..");
Deno.mkdirSync(join(ROOT_PATH, "tmp"), {recursive: true});
const TMP_DIR_REL = Deno.makeTempDirSync({prefix: "pdfBuild-", dir: "tmp"});
const TMP_DIR = join(ROOT_PATH, TMP_DIR_REL);
const SITEDATA = JSON.parse(Deno.readTextFileSync(join(ROOT_PATH, "_data", "sitedata.json")));
const FULLMD_PATH = join(ROOT_PATH, "_site", "downloads", `${SITEDATA.title.replaceAll(" ", "_")}.md`);
const PDF_DATA_PATH = join(ROOT_PATH, "pubs", "pdf");
const PDF_TARGET_DIR = join(ROOT_PATH, "pubs", "web", "static", "downloads");
Deno.mkdirSync(PDF_TARGET_DIR, {recursive: true});
const PDF_OUTPUT_FILENAME = `${SITEDATA.title.replaceAll(" ", "_")}.pdf`;

function getCmdOutput(cmd: string, args?: string[]): string {
	const command = new Deno.Command(cmd, {args, stdout: "piped"});
	const output = command.outputSync();
	return new TextDecoder().decode(output.stdout);
}

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
			actualContent = actualContent.replaceAll(src, `/pubs/web/static${src}`);
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
	const frontMatterOutputCmd = new Deno.Command("pandoc", {
		args: PANDOC_ARGS,
		stdin: "piped",
		stdout: "piped",
		stderr: "piped",
	});
	const frontMatterOutput = frontMatterOutputCmd.spawn();
	const frontMatterOutputWriter = frontMatterOutput.stdin.getWriter();
	await frontMatterOutputWriter.write(new TextEncoder().encode(prelims));
	await frontMatterOutputWriter.close();
	const frontMatterOutputResult = await frontMatterOutput.output();
	if (!frontMatterOutputResult.success) {
		console.error(`PANDOC ERROR: ${new TextDecoder().decode(frontMatterOutputResult.stderr)}`);
		return false;
	}
	else {
		const outPath = join(PDF_DATA_PATH, "srcs", "prelims.typ");
		Deno.writeFileSync(outPath, header);
		Deno.writeFileSync(outPath, _fixTables(frontMatterOutputResult.stdout), {append: true});
	}

	const mainMatterOutputCmd = new Deno.Command("pandoc", {
		args: PANDOC_ARGS,
		stdin: "piped",
		stdout: "piped",
		stderr: "piped",
	});
	const mainMatterOutput = mainMatterOutputCmd.spawn();
	const mainMatterOutputWriter = mainMatterOutput.stdin.getWriter();
	await mainMatterOutputWriter.write(new TextEncoder().encode(mainContent));
	await mainMatterOutputWriter.close();
	const mainMatterOutputResult = await mainMatterOutput.output();
	if (!mainMatterOutputResult.success) {
		console.error(`PANDOC ERROR: ${new TextDecoder().decode(mainMatterOutputResult.stderr)}`);
		return false;
	}
	else {
		const outPath = join(PDF_DATA_PATH, "srcs", "main.typ");
		Deno.writeFileSync(outPath, header);
		Deno.writeFileSync(outPath, _fixTables(mainMatterOutputResult.stdout), {append: true});
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

	const creatorCodes = `InfoBegin
InfoKey: Title
InfoValue: ${SITEDATA.title}
InfoBegin
InfoKey: Author
InfoValue: ${SITEDATA.authorName}
InfoBegin
InfoKey: Subject
InfoValue: ${SITEDATA.description}
InfoBegin
InfoKey: Creator
InfoValue: srhc-template (${getRevisionString(true)})
InfoBegin
InfoKey: Producer
InfoValue: ${getCmdOutput("typst", ["--version"])}`;
	const originalMetadata = new TextDecoder().decode(pdfMetaResult.stdout);
	const labelsOff = originalMetadata.split("\n").filter(ln => ln.startsWith("PageLabel")).join("\n");
	const labelsFixed = labelsOff.replace(
		/^PageLabelNewIndex:\s*(\d+)$/gm,
		(_, numStr) => {
			const num = parseInt(numStr);
			return `PageLabelNewIndex: ${num === 1 ? 1 : num + 1}`;
		}
	);
	Deno.writeTextFileSync(join(TMP_DIR, "pdf_metadata.txt"), creatorCodes);
	Deno.writeTextFileSync(join(TMP_DIR, "pdf_metadata.txt"), labelsFixed, {append: true});

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
