import fs from "node:fs";
import path from "node:path";
import child_process from "node:child_process";

import { optimize } from "svgo";

import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let compressibleExtensionSet = null;

function* walkDir(dir) {
  for (const d of fs.readdirSync(dir)) {
      const entry = path.join(dir, d);
      const estat = fs.statSync(entry);
      if (estat.size == 0) {
        throw new Error(`ERROR: Filesize of 0 on ${entry}`);
      }
      if (estat.isDirectory()) yield* walkDir(entry);
      else if (estat.isFile()) yield entry;
  }
}

function ensureCompressibleExtensionSet() {
  if (!compressibleExtensionSet) {
    const confPath = path.join(__dirname, "..", "..", "content", "_data", "compression.json");
    const compressionConfigStr = fs.readFileSync(confPath).toString();
    const compressionConfig = JSON.parse(compressionConfigStr);
    const extensionList = compressionConfig.compressibleFiles.map((extPair) => `.${extPair[0]}`);
    compressibleExtensionSet = new Set(extensionList);
  }
}

export function compressMe(filepath) {
  ensureCompressibleExtensionSet();
  const extName = path.extname(filepath);
  if (extName == ".svg") {
    // console.log(`Running svgo on ${filepath}`);
    const svgContent = fs.readFileSync(filepath);
    const compressed = optimize(svgContent, {
      path: filepath,
      multipass: true, // "anyway, we're in love"
    });
    fs.writeFileSync(filepath, compressed.data);
  }
  if (compressibleExtensionSet.has(extName)) {
    child_process.spawnSync("gzip", [
      "--keep", "--best", "--no-name",
      filepath
    ]);
    child_process.spawnSync("brotli", [
      "--best",
      filepath
    ])
  }
}

export default function (eleventyConfig) {
  eleventyConfig.on(
    "eleventy.after",
    ({ dir, results, runMode, outputMode }) => {
      console.log("Pre-compressing files in output directory...");
      for (const fp of walkDir(dir.output)) {
        compressMe(fp);
      }
    }
  );
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  console.log("Pre-compressing files in output directory...");
  const sitePath = path.join(__dirname, "..", "..", "_site");
  for (const fp of walkDir(sitePath)) {
    compressMe(fp);
  }
}
