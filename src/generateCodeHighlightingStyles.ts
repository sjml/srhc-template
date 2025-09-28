import { join, dirname, fromFileUrl, relative, basename } from "@std/path";

const __filename = fromFileUrl(import.meta.url);
const __dirname = dirname(__filename);

const ROOT_DIR = join(__dirname, "..");
const SCRIPT_NAME = relative(ROOT_DIR, __filename);
const SRC_DIR = join(ROOT_DIR, "resources", "syntax-highlighting");
const CSS_TARGET = join(ROOT_DIR, "css", "_code.scss");
const LATEX_TARGET = join(ROOT_DIR, "pubs", "pdf", "config", "code.tex");

const WEB_INPUTS = [
	join(SRC_DIR, "webLight.json"),
	join(SRC_DIR, "webDark.json"),
];
const LATEX_INPUT = join(SRC_DIR, "webLight.json");

interface TextStyle {
	"text-color": string|null,
	"background-color": string|null,
	"bold": boolean,
	"italic": boolean,
	"underline": boolean,
};

interface StyleData {
	"text-color": string|null,
	"background-color": string|null,
	"line-number-color": string|null,
	"line-number-background-color": string|null,
	"text-styles": {[styleName: string]: TextStyle},
}

const tagMapping: {[tagName: string]: string} = {
	Alert: "al",
	Annotation: "an",
	Attribute: "at",
	BaseN: "bn",
	BuiltIn: "bu",
	ControlFlow: "cf",
	Char: "ch",
	Constant: "cn",
	Comment: "co",
	CommentVar: "cv",
	Documentation: "do",
	DataType: "dt",
	DecVal: "dv",
	Error: "er",
	Extension: "ex",
	Float: "fl",
	Function: "fu",
	Import: "im",
	Information: "in",
	Keyword: "kw",
	Operator: "op",
	Other: "ot",
	Preprocessor: "pp",
	SpecialChar: "sc",
	SpecialString: "ss",
	String: "st",
	Variable: "va",
	VerbatimString: "vs",
	Warning: "wa",
}


const headerLines = [
	`This file was generated from ${SCRIPT_NAME}.`,
	`Don't edit directly!`,
];
const footerLines = [
	`End of ${SCRIPT_NAME} generation.`
];

const cssOutput = WEB_INPUTS.map((srcFile) => {
	const styleData: StyleData = JSON.parse(Deno.readTextFileSync(srcFile));
	const cssOut = Object.entries(styleData["text-styles"]).map(([name, data]) => {
		let styleStr = `\t\t/* ${name} */\n\t\tspan.${tagMapping[name]} {\n`;
		let has = false;
		if (data["text-color"]) {
			styleStr += `\t\t\tcolor: ${data["text-color"]};\n`;
			has = true;
		}
		if (data["background-color"]) {
			styleStr += `\t\t\tbackground-color: ${data["background-color"]};\n`;
			has = true;
		}
		if (data["bold"]) {
			styleStr += `\t\t\tfont-weight: bold;\n`;
			has = true;
		}
		if (data["italic"]) {
			styleStr += `\t\t\tfont-style: italic;\n`;
			has = true;
		}
		if (data["underline"]) {
			styleStr += `\t\t\ttext-decoration: underline;\n`;
			has = true;
		}

		styleStr += "\t\t}";
		return has ? styleStr : null;
	}).filter(v => v != null).join("\n\n");

	const mixin = `@mixin code-${basename(srcFile, ".json")} {\n\tcode {\n${cssOut}\n\t}\n}\n`;
	return mixin;

}).join("\n\n");

const cssOutString = `${headerLines.map(h => `// ${h}`).join("\n")}\n\n${cssOutput}\n${footerLines.map(h => `// ${h}`).join("\n")}`;
Deno.writeTextFileSync(CSS_TARGET, cssOutString);


function hexToRGBi(hexColor: string) {
	return hexColor.replace(/^#?([a-f\d])([a-f\d])([a-f\d])$/i,
			(_m, r, g, b) => '#' + r + r + g + g + b + b)
		.substring(1).match(/.{2}/g)!
		.map(x => parseInt(x, 16));
}
function _hexToRGBf(hexColor: string) {
	return hexToRGBi(hexColor).map(x => x / 255);
}

const latexPrefix = `\\usepackage{color}
\\usepackage{fancyvrb}
\\newcommand{\\VerbBar}{|}
\\newcommand{\\VERB}{\\Verb[commandchars=\\\\\\{\\}]}
\\DefineVerbatimEnvironment{Highlighting}{Verbatim}{commandchars=\\\\\\{\\},fontsize=\\small}
\\definecolor{shadecolor}{RGB}{248,249,250} % $gray-100`;

const styleData: StyleData = JSON.parse(Deno.readTextFileSync(LATEX_INPUT));
const latexOutput = Object.entries(styleData["text-styles"]).map(([name, data]) => {
	// let cmd = `\\newcommand{\\${name}Tok}[1]{\\textcolor[rgb]{${hexToRGBf()}}}`
	let cmd = "#1";
	if (data["italic"]) {
		cmd = `\\textit{${cmd}}`;
	}
	if (data["bold"]) {
		cmd = `\\textbf{${cmd}}`;
	}
	if (data["underline"]) {
		cmd = `\\underline{${cmd}}`;
	}
	if (data["text-color"]) {
		cmd = `\\textcolor[RGB]{${hexToRGBi(data["text-color"]).join(",")}}{${cmd}}`;
	}

	return `\\newcommand{\\${name}Tok}[1]{${cmd}}`
}).join("\n");

const latexOutString = `${headerLines.map(h => `% ${h}`).join("\n")}\n\n${latexPrefix}\n${latexOutput}\n\n${footerLines.map(h => `% ${h}`).join("\n")}`;
Deno.writeTextFileSync(LATEX_TARGET, latexOutString);
