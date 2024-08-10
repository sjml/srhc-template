import fs from "node:fs";
import path from "node:path";
import child_process from "node:child_process";

import slugify from "@sindresorhus/slugify";
import { JSDOM } from "jsdom";
import prettier from "prettier";

import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT_PATH = path.resolve(path.join(__dirname, "..", ".."));
fs.mkdirSync("tmp", {recursive: true});
const TMP_DIR = fs.mkdtempSync(path.join(ROOT_PATH, "tmp/epubBuild-"));
const SITEDATA = JSON.parse(fs.readFileSync(path.join(ROOT_PATH, "content", "_data", "sitedata.json")));
const FULLMD_PATH = path.join(ROOT_PATH, "_site", "full", `${slugify(SITEDATA.title)}.md`);
const EPUB_DATA_PATH = path.join(ROOT_PATH, "pubs", "epub");
const EPUB_TARGET_DIR = path.join(ROOT_PATH, "static", "downloads")
fs.mkdirSync(EPUB_TARGET_DIR, {recursive: true});
const EPUB_OUTPUT_BASENAME = SITEDATA.title.replaceAll(" ", "");
const EPUB_OUTPUT_FILENAME = `${EPUB_OUTPUT_BASENAME}.epub`;
const EPUB_WORKING_DIR = path.join(TMP_DIR, `${EPUB_OUTPUT_BASENAME}_epub`);


export default async function main() {
  console.log("ePUB Build: Prepping Markdown sources from built site...");
  const fullMD = fs.readFileSync(FULLMD_PATH).toString("utf-8");
  // strip off all the standalone markdown frontmatter
  const hrSplits = fullMD.split("\n----\n");
  let actualContent = hrSplits.slice(2).join("\n----\n");

  // could so some of this with a JSON filter in here but less code == better code
  const imgSrcList = child_process.spawnSync("pandoc", [
      "--from", "markdown+implicit_header_references-implicit_figures",
      "--to", "json", // dummy output
      "--lua-filter", path.join(ROOT_PATH, "src", "pandocFilters", "getImageList.lua"),
      "-o", "/dev/null"
    ],
    { input: actualContent }
  );
  if (imgSrcList.status != 0) {
    console.error(`PANDOC ERROR: ${imgSrcList.stderr}`);
    return false;
  }

  console.log("ePUB Build: Prepping image links and converting SVGs...");
  imgSrcList.stdout.toString("utf-8").split("\n").forEach(src => {
    if (src.endsWith(".svg")) {
      const outSrc = `${src.slice(0, -4)}.png`;
      const outPath = path.join(TMP_DIR, outSrc);
      fs.mkdirSync(path.dirname(outPath), {recursive: true});
      const convProc = child_process.spawnSync("rsvg-convert", [
        "--keep-aspect-ratio",
        "--width", "2048",
        "--format", "png",
        "--output", outPath,
        path.join(ROOT_PATH, "static", src)
      ]);
      if (convProc.status != 0) {
        console.error(`RSVG-CONVERT ERROR: ${convProc.stderr}`);
        return false;
      }
      actualContent = actualContent.replaceAll(src, outPath);
    }
    else if (src.startsWith("/")) {
      actualContent = actualContent.replaceAll(src, path.join(process.cwd(), path.join(ROOT_PATH, "static", src)));
    }
  });
  fs.writeFileSync(path.join(TMP_DIR, "content.md"), actualContent);

  console.log("ePUB Build: Running Pandoc...");
  const PANDOC_ARGS = [
    "--from", "markdown+implicit_header_references-implicit_figures",
    "--to", "epub3",
    "--epub-cover-image", "./resources/demo-assets/fakeCoverBig.jpg",
    "--epub-title-page=false",
    "--css", "./css/out/srhc-epub.css",
    "--variable", "highlighting-css=", // keeps pandoc from inserting its own CSS in the rendered files
    "--epub-embed-font=resources/fonts/Alegreya/static/Alegreya-Regular.woff2",
    "--epub-embed-font=resources/fonts/Alegreya/static/Alegreya-Italic.woff2",
    "--epub-embed-font=resources/fonts/Alegreya/static/Alegreya-Bold.woff2",
    "--epub-embed-font=resources/fonts/Alegreya/static/Alegreya-BlackItalic.woff2",
    "--epub-embed-font=resources/fonts/Alegreya/static/Alegreya-Black.woff2",
    "--epub-embed-font=resources/fonts/CascadiaMono/static/CascadiaMono-SemiLight.woff2",
    "--epub-embed-font=resources/fonts/CascadiaMono/static/CascadiaMono-SemiLightItalic.woff2",
    "--epub-embed-font=resources/fonts/CascadiaMono/static/CascadiaMono-Bold.woff2",
    "--epub-embed-font=resources/fonts/CascadiaMono/static/CascadiaMono-BoldItalic.woff2",
    "--epub-embed-font=resources/fonts/DavidLibre/DavidLibre-Regular.woff2",
    "--epub-embed-font=resources/fonts/DavidLibre/DavidLibre-Medium.woff2",
    "--shift-heading-level-by=-1",
    "--top-level-division", "part",
    "--highlight-style", "pygments",
    "--syntax-definition", path.join("resources", "syntax-highlighting", "pymod", "pymod.xml"),
    "--toc",
    "--toc-depth", "2",
    "--split-level", "2",
    "--output", path.join(TMP_DIR, EPUB_OUTPUT_FILENAME),
    "./pubs/epub/metadata.md",
    path.join(TMP_DIR, "content.md")
  ];
  const pandocOutput = child_process.spawnSync("pandoc", PANDOC_ARGS);
  if (pandocOutput.status != 0) {
    console.error(`PANDOC ERROR: ${pandocOutput.stderr}`);
    return false;
  }
  else {
    const pandocStderr = pandocOutput.stderr.toString("utf-8").trim();
    if (pandocStderr.length > 0) {
      console.warn(pandocStderr);
    }
  }


  console.log("ePUB Build: Patching output file...");
  const unzipOutput = child_process.spawnSync("unzip", [
    "-d", EPUB_WORKING_DIR,
    path.join(TMP_DIR, EPUB_OUTPUT_FILENAME),
  ]);
  if (unzipOutput.status != 0) {
    console.error(`UNZIP ERROR: ${unzipOutput.stderr}`);
    return false;
  }

  // grab title page image out of sibling PDF
  const extractProc = child_process.spawnSync("gs", [
    "-dSAFER", "-dQUIET", "-dNOPLATFONTS", "-dNOPAUSE", "-dBATCH",
    `-sOutputFile=${path.join(EPUB_WORKING_DIR, "EPUB", "media", "titlepage.png")}`,
    "-sDEVICE=pngalpha",
    "-r300",
    "-dTextAlphaBits=4",
    "-dGraphicsAlphaBits=4",
    "-dUseCIEColor",
    "-dUseTrimBox",
    "-dFirstPage=2",
    "-dLastPage=2",
    path.join(EPUB_TARGET_DIR, `${EPUB_OUTPUT_BASENAME}.pdf`)
  ]);
  if (extractProc.status != 0) {
    console.error(`GHOSTSCRIPT ERROR: ${extractProc.stderr}`);
    return false;
  }

  const resizeProc = child_process.spawnSync("convert", [
    path.join(EPUB_WORKING_DIR, "EPUB", "media", "titlepage.png"),
    "-trim",
    "-scale", "50%",
    "-bordercolor", "transparent",
    "-border", "100x50",
    // "-alpha", "remove",
    path.join(EPUB_WORKING_DIR, "EPUB", "media", "titlepage.png")
  ]);
  if (resizeProc.status != 0) {
    console.error(`IMAGEMAGICK ERROR: ${resizeProc.stderr} \nstdout: ${resizeProc.stdout}`);
    return false;
  }

  fs.copyFileSync(
    path.join(ROOT_PATH, "resources", "licensing", "by-nc-sa.png"),
    path.join(EPUB_WORKING_DIR, "EPUB", "media", "by-nc-sa.png")
  );
  fs.copyFileSync(
    path.join(EPUB_DATA_PATH, "srcs", "rights.xhtml"),
    path.join(EPUB_WORKING_DIR, "EPUB", "text", "rights.xhtml")
  );
  fs.copyFileSync(
    path.join(EPUB_DATA_PATH, "srcs", "titlepage.xhtml"),
    path.join(EPUB_WORKING_DIR, "EPUB", "text", "titlepage.xhtml")
  );

  const opfPath = path.join(EPUB_WORKING_DIR, "EPUB", "content.opf");
  const opfDataStr = fs.readFileSync(opfPath).toString("utf-8");
  const opfWindow = new JSDOM(opfDataStr, {
    contentType: "application/xml"
  }).window;
  const opfDocument = opfWindow.document;

  const manifest = opfDocument.getElementsByTagName("manifest")[0];
  [
    ["text/rights.xhtml", "rights_xhtml"],
    ["text/titlepage.xhtml", "titlepage_xhtml"],
  ].forEach(([fpath, fid]) => {
    const newItem = opfDocument.createElement("item");
    newItem.setAttribute("href", fpath);
    newItem.setAttribute("id", fid);
    newItem.setAttribute("media-type", "application/xhtml+xml");
    if (fid == "titlepage_xhtml") {
      newItem.setAttribute("properties", "svg");
    }
    manifest.appendChild(newItem);
  });
  const titleImgItem = opfDocument.createElement("item");
  titleImgItem.setAttribute("href", "media/titlepage.png");
  titleImgItem.setAttribute("id", "titlepage_png");
  titleImgItem.setAttribute("media-type", "image/png");
  manifest.appendChild(titleImgItem);

  const licenseImgItem = opfDocument.createElement("item");
  licenseImgItem.setAttribute("href", "media/by-nc-sa.png");
  licenseImgItem.setAttribute("id", "by-nc-sa_png");
  licenseImgItem.setAttribute("media-type", "image/png");
  manifest.appendChild(licenseImgItem);

  const spine = opfDocument.querySelector("spine[toc='ncx']");
  const spineNav = spine.querySelector(":scope > itemref[idref='nav']");
  const rightsItem = opfDocument.createElement("itemref");
  rightsItem.setAttribute("idref", "rights_xhtml");
  spine.insertBefore(rightsItem, spineNav);
  const titlePageItem = opfDocument.createElement("itemref");
  titlePageItem.setAttribute("idref", "titlepage_xhtml");
  spine.insertBefore(titlePageItem, rightsItem);

  opfDocument.insertBefore(
    opfDocument.createProcessingInstruction("xml", "version=\"1.0\" encoding=\"UTF-8\""),
    opfDocument.firstChild
  );
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

  console.log("ePUB Build: Re-zipping...");
  fs.rmSync(path.join(TMP_DIR, EPUB_OUTPUT_FILENAME));
  const zipMTProc = child_process.spawnSync("zip", [
      "-0", // the mimetype has to be stored directly
      "-X", // no extra file attributes or something?
      "-q", // ssssshhhhhhhh
      path.join(TMP_DIR, EPUB_OUTPUT_FILENAME),
      "mimetype"
    ],
    { cwd: EPUB_WORKING_DIR }
  );
  if (zipMTProc.status != 0) {
    console.error(`ZIP ERROR: ${zipMTProc.stderr}`);
    return false;
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
    { cwd: EPUB_WORKING_DIR }
  );
  if (zipRestProc.status != 0) {
    console.error(`ZIP ERROR: ${zipRestProc.stderr}`);
    return false;
  }

  console.log("ePUB Build: Validating final output...")
  const epubCheckProc = child_process.spawnSync("epubcheck", [
    "--failonwarnings", "--warn", "--quiet",
    path.join(TMP_DIR, EPUB_OUTPUT_FILENAME),
  ]);
  if (epubCheckProc.status != 0) {
    console.error(`EPUBCHECK ERROR: ${epubCheckProc.stderr}`);
    return false;
  }

  console.log("ePUB Build: Cleaning up...");
  fs.renameSync(
    path.join(TMP_DIR, EPUB_OUTPUT_FILENAME),
    path.join(EPUB_TARGET_DIR, EPUB_OUTPUT_FILENAME)
  );

  fs.rmSync(TMP_DIR, {recursive: true, force: true});

  return true;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  (await main()) ? process.exit(0) : process.exit(1);
}
