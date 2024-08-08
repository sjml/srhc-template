import fs from "node:fs/promises";
import child_process from "node:child_process";
import path from "node:path";

import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import * as versionInfo from "../getRevisionInfo.js";

async function readJsonFile(filePath) {
  const contents = await fs.readFile(filePath);
  const data = JSON.parse(contents);
  return data;
};

async function runProgram(command, args, versionRegex) {
  const result = await new Promise((res, rej) => {
    child_process.exec(`${command} ${args.join(" ")}`,
      (err, stdout, stderr) => {
        if (err) {
          rej(err);
        }
        else {
          res(stdout);
        }
      }
    )
  });
  if (versionRegex) {
    const resMatch = result.match(versionRegex);
    if (resMatch === null) {
      throw new Error(`${path.basename(__filename)} Version regex for ${command} didn't find anything in output.`);
    }
    return resMatch[1];
  }
  else {
    return result.trim();
  }
}

export default function (eleventyConfig) {
  eleventyConfig.on(
    "eleventy.after",
    async ({ dir, results, runMode, outputMode }) => {
      console.log("Stamping build information...");
      let output = {};

      output.systemInfo = await runProgram("uname", ["-a"], null);
      output.buildTimestamp = (new Date()).toISOString().slice(0,-5)+"Z";
      output.revisionTimestamp = versionInfo.getRevisionDate();
      output.localGitRevision = versionInfo.getRevisionString();

      output.softwareVersions = {};
      output.softwareVersions.git = await runProgram("git", ["--version"], /version (.*)\n/);
      output.softwareVersions.eleventy = await runProgram("npx", ["eleventy", "--version"], null);
      output.softwareVersions.pandoc = await runProgram("pandoc", ["--version"], /^pandoc (.*)\n/);
      output.softwareVersions.tectonic = await runProgram("tectonic", ["--version"], /Tectonic (.*)\n/);
      output.softwareVersions.rsvgConvert = await runProgram("rsvg-convert", ["--version"], /version (.*)\n/);
      output.softwareVersions.imageMagick = await runProgram("convert", ["--version"], /Version: (.*) https/);
      output.softwareVersions.ghostscript = await runProgram("gs", ["--version"], null);
      output.softwareVersions.calibre = await runProgram("ebook-convert", ["--version"], /calibre ([\d.]*)/)
      output.softwareVersions.epubcheck = await runProgram("epubcheck", ["--version", "--quiet"], / v(.*)\n/);
      output.softwareVersions.gzip = await runProgram("gzip", ["--version", "2>&1"], /(.*)\n/);
      output.softwareVersions.brotli = await runProgram("brotli", ["--version"], /brotli (.*)\n/);
      output.softwareVersions.zip = await runProgram("zip", ["--version"], /This is Zip ([\d\.]*)/)
      output.softwareVersions.unzip = await runProgram("unzip", ["-v"], /UnZip ([\d\.]*)/)

      output.nodePackages = await readJsonFile("./package-lock.json");

      await fs.writeFile(
        path.join(dir.output, "buildRecord.json"),
        JSON.stringify(output, null, 2)
      );
    }
  );
}
