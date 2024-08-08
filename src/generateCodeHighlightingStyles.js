import fs from "node:fs";
import path from "node:path";

import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT_DIR = path.join(__dirname, "..");
const SCRIPT_NAME = path.relative(ROOT_DIR, __filename);
const SRC_DIR = path.join(ROOT_DIR, "resources", "syntax-highlighting");
const CSS_TARGET = path.join(ROOT_DIR, "css", "_code.scss");
const LATEX_TARGET = path.join(ROOT_DIR, "pubs", "pdf", "config", "code.tex");

const WEB_INPUTS = [
  path.join(SRC_DIR, "webLight.json"),
  path.join(SRC_DIR, "webDark.json"),
];
const LATEX_INPUT = path.join(SRC_DIR, "webLight.json");

const tagMapping = {
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

async function main() {
  const headerLines = [
    `This file was generated from ${SCRIPT_NAME}.`,
    `Don't edit directly!`,
  ];
  const footerLines = [
    `End of ${SCRIPT_NAME} generation.`
  ];

  const cssOutput = WEB_INPUTS.map((srcFile) => {
    const styleData = JSON.parse(fs.readFileSync(srcFile));
    const cssOut = Object.entries(styleData["text-styles"]).map(([name, data]) => {
      let styleStr = `    /* ${name} */\n    span.${tagMapping[name]} {\n`;
      let has = false;
      if (data["text-color"]) {
        styleStr += `      color: ${data["text-color"]};\n`;
        has = true;
      }
      if (data["background-color"]) {
        styleStr += `      background-color: ${data["background-color"]};\n`;
        has = true;
      }
      if (data["bold"]) {
        styleStr += `      font-weight: bold;\n`;
        has = true;
      }
      if (data["italic"]) {
        styleStr += `      font-style: italic;\n`;
        has = true;
      }
      if (data["underline"]) {
        styleStr += `      text-decoration: underline;\n`;
        has = true;
      }

      styleStr += "    }";
      return has ? styleStr : null;
    }).filter(v => v != null).join("\n\n");

    const mixin = `@mixin code-${path.basename(srcFile, ".json")} {\n  code {\n${cssOut}\n  }\n}\n`;
    return mixin;

  }).join("\n\n");

  const cssOutString = `${headerLines.map(h => `// ${h}`).join("\n")}\n\n${cssOutput}\n${footerLines.map(h => `// ${h}`).join("\n")}`;
  fs.writeFileSync(CSS_TARGET, cssOutString);


  function hexToRGBi(hexColor) {
    return hexColor.replace(/^#?([a-f\d])([a-f\d])([a-f\d])$/i,
        (m, r, g, b) => '#' + r + r + g + g + b + b)
      .substring(1).match(/.{2}/g)
      .map(x => parseInt(x, 16));
  }
  function hexToRGBf(hexColor) {
    return hexToRGBi(hexColor).map(x => x / 255);
  }

  const latexPrefix = `\\usepackage{color}
\\usepackage{fancyvrb}
\\newcommand{\\VerbBar}{|}
\\newcommand{\\VERB}{\\Verb[commandchars=\\\\\\{\\}]}
\\DefineVerbatimEnvironment{Highlighting}{Verbatim}{commandchars=\\\\\\{\\},fontsize=\\small}
\\definecolor{shadecolor}{RGB}{248,249,250} % $gray-100`;

  const styleData = JSON.parse(fs.readFileSync(LATEX_INPUT));
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
  fs.writeFileSync(LATEX_TARGET, latexOutString);
}

main();
