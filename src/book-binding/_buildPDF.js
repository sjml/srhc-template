import fs from "node:fs";
import path from "node:path";
import child_process from "node:child_process";

import slugify from "@sindresorhus/slugify";

import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


const ROOT_PATH = path.join(__dirname, "..", "..");
fs.mkdirSync("tmp", {recursive: true});
const TMP_DIR = fs.mkdtempSync("tmp/pdfBuild-");
const SITEDATA = JSON.parse(fs.readFileSync(path.join(ROOT_PATH, "content", "_data", "sitedata.json")));
const FULLMD_PATH = path.join(ROOT_PATH, "_site", "full", `${slugify(SITEDATA.title)}.md`);
const PDF_DATA_PATH = path.join(ROOT_PATH, "pubs", "pdf");
const PDF_TARGET_DIR = path.join(ROOT_PATH, "static", "downloads")
fs.mkdirSync(PDF_TARGET_DIR, {recursive: true});
const PDF_OUTPUT_FILENAME = `${SITEDATA.title.replaceAll(" ", "")}.pdf`;

export default function main() {
  console.log("PDF Build: Prepping Markdown sources from built site...");
  const fullMD = fs.readFileSync(FULLMD_PATH).toString("utf-8");

  // take off everything leading up to the first actual chapter
  //   (including the name of the first section which is probably
  //    just something like "Preliminaries")
  const firstSplit = fullMD.indexOf("\n### ");
  let actualContent = fullMD.slice(firstSplit);

  // could so some of this with a JSON filter in here but less code == better code
  const imgSrcList = child_process.spawnSync("pandoc", [
      "--from", "markdown+implicit_header_references-implicit_figures",
      "--to", "json", // dummy output
      "--lua-filter", path.join(ROOT_PATH, "pubs", "_filters", "getImageList.lua"),
      "-o", "/dev/null"
    ],
    { input: actualContent }
  );
  if (imgSrcList.status != 0) {
    console.error(`PANDOC ERROR: ${imgSrcList.stderr}`);
    return false;
  }

  console.log("PDF Build: Prepping image links and converting SVGs...");
  imgSrcList.stdout.toString("utf-8").split("\n").forEach(src => {
    if (src.endsWith(".svg")) {
      const outSrc = `${src.slice(0, -4)}.pdf`;
      const outPath = path.join(TMP_DIR, outSrc);
      fs.mkdirSync(path.dirname(outPath), {recursive: true});
      const convProc = child_process.spawnSync("rsvg-convert", [
        "--keep-aspect-ratio",
        "--format", "pdf1.5",
        "--output", outPath,
        path.join(ROOT_PATH, "static", src)
      ]);
      if (convProc.status != 0) {
        console.error(`RSVG-CONVERT ERROR: ${convProc.stderr}`);
        return false;
      }
      const relFilePath = path.join("../../", outPath);
      actualContent = actualContent.replaceAll(src, relFilePath);
    }
    else if (src.startsWith("/")) {
      actualContent = actualContent.replaceAll(src, path.join(process.cwd(), path.join(ROOT_PATH, "static", src)));
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
    "--highlight-style", "pygments",
    "--lua-filter", path.join(ROOT_PATH, "pubs", "_filters", "latexFilters.lua"),
    "--syntax-definition", path.join("resources", "syntax-highlighting", "pymod", "pymod.xml"),
  ];

  console.log("PDF Build: Generating TeX files...");
  const prelimTexProc = child_process.spawnSync("pandoc",
    PANDOC_ARGS, { input: prelims }
  )
  if (prelimTexProc.status != 0) {
    console.error(`PANDOC ERROR: ${prelimTexProc.stderr}`);
    return false;
  }
  else {
    fs.writeFileSync(
      path.join(PDF_DATA_PATH, "srcs", "prelims.tex"),
      prelimTexProc.stdout.toString("utf8")
    );
  }

  const mainTexProc = child_process.spawnSync("pandoc",
    PANDOC_ARGS, { input: mainContent }
  )
  if (mainTexProc.status != 0) {
    console.error(`PANDOC ERROR: ${mainTexProc.stderr}`);
    return false;
  }
  else {
    fs.writeFileSync(
      path.join(PDF_DATA_PATH, "srcs", "main.tex"),
      mainTexProc.stdout.toString("utf8")
    );
  }

  console.log("PDF Build: Building PDF from TeX files...");
  const tectonicOutput = child_process.spawnSync("tectonic",
    [
      "--outfmt", "pdf",
      path.join(PDF_DATA_PATH, "full.tex")
    ]
  );
  function logErrFilter(log) {
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
  const tectonicStdErr = tectonicOutput.stderr.toString("utf-8");
  const errStrings = logErrFilter(tectonicStdErr);
  if (tectonicOutput.status != 0) {
    console.error(`TECTONIC ERROR: ${tectonicOutput.stderr}`);
    const timestamp = new Date().toISOString();
    fs.writeFileSync(
      path.join(ROOT_PATH, "tmp", `tectonic-log-${timestamp}.txt`),
      tectonicOutput.stderr
    );
    return false;
  }
  else if (errStrings) {
    errStrings.forEach(line => console.error(line));
    const timestamp = new Date().toISOString();
    fs.writeFileSync(
      path.join(ROOT_PATH, "tmp", `tectonic-log-${timestamp}.txt`),
      tectonicOutput.stderr
    );
    return false;
  }
  else {
    fs.renameSync(
      path.join(PDF_DATA_PATH, "full.pdf"),
      path.join(PDF_TARGET_DIR, PDF_OUTPUT_FILENAME)
    );
    // const timestamp = new Date().toISOString();
    // fs.writeFileSync(
    //   path.join(ROOT_PATH, "tmp", `tectonic-log-${timestamp}.txt`),
    //   tectonicOutput.stderr
    // );
  }

  console.log("PDF Build: Cleaning up...");
  fs.rmSync(TMP_DIR, {recursive: true, force: true});
  return true;
};

if (import.meta.url === `file://${process.argv[1]}`) {
  main() ? process.exit(0) : process.exit(1);
}
