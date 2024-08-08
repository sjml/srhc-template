import fs from "node:fs";
import path from "node:path";
import child_process from "node:child_process";

import { JSDOM } from "jsdom";
import prettier from "prettier";

import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT_PATH = path.resolve(path.join(__dirname, "..", ".."));
fs.mkdirSync("tmp", {recursive: true});
const TMP_DIR = fs.mkdtempSync(path.join(ROOT_PATH, "tmp/kindleBuild-"));
const SITEDATA = JSON.parse(fs.readFileSync(path.join(ROOT_PATH, "content", "_data", "sitedata.json")));
const KINDLE_TARGET_DIR = path.join(ROOT_PATH, "static", "downloads")
fs.mkdirSync(KINDLE_TARGET_DIR, {recursive: true});
const OUTPUT_BASENAME = SITEDATA.title.replaceAll(" ", "");
const EPUB_OUTPUT_FILENAME = `${OUTPUT_BASENAME}.epub`;
const KINDLE_WORKING_DIR = path.join(TMP_DIR, `${OUTPUT_BASENAME}_epub`);

export default async function main() {
  console.log("Kindle Build: Unzipping ePUB file...");
  const unzipProc = child_process.spawnSync("unzip", [
    "-d", KINDLE_WORKING_DIR,
    path.join(KINDLE_TARGET_DIR, EPUB_OUTPUT_FILENAME),
  ]);
  if (unzipProc.status != 0) {
    console.error(`UNZIP ERROR: ${unzipProc.stderr}`);
    process.exit(1);
  }

  console.log("Kindle Build: Modifying for Kindle...")
  // get the Kindle CSS
  fs.copyFileSync(
    path.join(ROOT_PATH, "css", "out", "srhc-kindle.css"),
    path.join(KINDLE_WORKING_DIR, "EPUB", "styles", "stylesheet1.css")
  );

  const opfPath = path.join(KINDLE_WORKING_DIR, "EPUB", "content.opf");
  const opfDataStr = fs.readFileSync(opfPath).toString("utf-8");
  const opfWindow = new JSDOM(opfDataStr, {
    contentType: "application/xml"
  }).window;
  const opfDocument = opfWindow.document;

  for (const fontFile of fs.readdirSync(path.join(KINDLE_WORKING_DIR, "EPUB", "fonts"))) {
    const pathTo = path.join("fonts", fontFile);
    fs.rmSync(path.join(KINDLE_WORKING_DIR, "EPUB", pathTo));
    const opfItem = opfDocument.querySelector(`item[href='${pathTo}']`);
    opfItem.remove();
  }
  let xs = new opfWindow.XMLSerializer();
  let opfOutput = xs.serializeToString(opfDocument);
  opfOutput = opfOutput.replaceAll('xmlns=""', "");
  opfOutput = await prettier.format(opfOutput, {
    parser: "xml",
    plugins: ["@prettier/plugin-xml"],
    xmlWhitespaceSensitivity: "ignore",
    tabWidth: 2,
    printWidth: 100,
  });
  fs.writeFileSync(opfPath, opfOutput);
  // TBD: what other changes do we have to make for Kindle?

  console.log("Kindle Build: Re-zipping...");
  const zipMTProc = child_process.spawnSync("zip", [
      "-0", // the mimetype has to be stored directly
      "-X", // no extra file attributes or something?
      "-q", // ssssshhhhhhhh
      path.join(TMP_DIR, EPUB_OUTPUT_FILENAME),
      "mimetype"
    ],
    { cwd: KINDLE_WORKING_DIR }
  );
  if (zipMTProc.status != 0) {
    console.error(`ZIP ERROR: ${zipMTProc.stderr}`);
    process.exit(1);
  }

  const zipRestProc = child_process.spawnSync("zip", [
      "-9", // high compression
      "-X", // no extra file attributes or something?
      "-r", // recursive
      "-D", // no directory entries
      "-q", // ssssshhhhhhhh
      path.join(TMP_DIR, EPUB_OUTPUT_FILENAME),
      "EPUB", "META-INF"
    ],
    { cwd: KINDLE_WORKING_DIR }
  );
  if (zipRestProc.status != 0) {
    console.error(`ZIP ERROR: ${zipRestProc.stderr}`);
    process.exit(1);
  }

  console.log("Kindle Build: Validating intermediate output...")
  const epubCheckProc = child_process.spawnSync("epubcheck", [
    "--failonwarnings", "--warn", "--quiet",
    path.join(TMP_DIR, EPUB_OUTPUT_FILENAME),
  ]);
  if (epubCheckProc.status != 0) {
    console.error(`EPUBCHECK ERROR: ${epubCheckProc.stderr}`);
    return false;
  }

  console.log("Kindle Build: Converting to azw3...");
  const azw3Proc = child_process.spawnSync("ebook-convert", [
    path.join(TMP_DIR, EPUB_OUTPUT_FILENAME),
    path.join(TMP_DIR, `${OUTPUT_BASENAME}.azw3`)
  ]);
  if (azw3Proc.status != 0) {
    console.error(`EBOOK-CONVERT ERROR: ${azw3Proc.stderr}`);
    process.exit(1);
  }
  else {
    let problem = false;
    azw3Proc.stdout.toString("utf-8").split("\n").forEach(line => {
      if (line.match(/Warning|Error/)) {
        console.warn(line);
        problem = true;
      }
    });
    if (problem) {
      process.exit(1);
    }
  }

  console.log("Kindle Build: Converting to mobi...");
  const mobiProc = child_process.spawnSync("ebook-convert", [
    path.join(TMP_DIR, EPUB_OUTPUT_FILENAME),
    path.join(TMP_DIR, `${OUTPUT_BASENAME}.mobi`)
  ]);
  if (mobiProc.status != 0) {
    console.error(`EBOOK-CONVERT ERROR: ${mobiProc.stderr}`);
    process.exit(1);
  }
  else {
    let problem = false;
    mobiProc.stdout.toString("utf-8").split("\n").forEach(line => {
      if (line.match(/Warning|Error/)) {
        console.warn(line);
        problem = true;
      }
    });
    if (problem) {
      process.exit(1);
    }
  }


  console.log("Kindle Build: Cleaning up...");
  fs.renameSync(
    path.join(TMP_DIR, `${OUTPUT_BASENAME}.azw3`),
    path.join(KINDLE_TARGET_DIR, `${OUTPUT_BASENAME}.azw3`)
  );
  fs.renameSync(
    path.join(TMP_DIR, `${OUTPUT_BASENAME}.mobi`),
    path.join(KINDLE_TARGET_DIR, `${OUTPUT_BASENAME}.mobi`)
  );

  fs.rmSync(TMP_DIR, {recursive: true, force: true});

  return true;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main() ? process.exit(0) : process.exit(1);
}
