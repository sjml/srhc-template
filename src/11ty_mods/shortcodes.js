import * as fs from "node:fs/promises";

import { getRevisionString, getRevisionDate } from "../getRevisionInfo.js";

export default (eleventyConfig) => {
  // for debugging data values when developing templates
  eleventyConfig.addFilter("console", function(value) {
    const output = stringify(value, null, "\t", { maxDepth: 3 });
    console.log(output);
    return '';
  });

  eleventyConfig.addShortcode("getRevisionString", function(type = "full") {
    if (type == "short") {
      return getRevisionString(true);
    }
    return getRevisionString();
  });

  eleventyConfig.addShortcode("getRevisionDate", function() {
    return getRevisionDate();
  });

  eleventyConfig.addShortcode("inlineFile", async function(filePath, separator = "") {
    let fp = filePath;
    if (Array.isArray(fp)) {
      fp = filePath.join(separator);
    }
    try {
      const fileContentsRaw = await fs.readFile(fp);
      const fileContents = fileContentsRaw.toString("utf-8");
      return fileContents;
    } catch(error) {
      console.warn(`WARNING: Couldn't include file at '${fp}'`);
      return `[COULD NOT INCLUDE FILE: '${fp}']`;
    }
  });

  eleventyConfig.addShortcode("getFileSize", async function(filePath, separator = "") {
    let fp = filePath;
    if (Array.isArray(fp)) {
      fp = filePath.join(separator);
    }
    let stat;
    try {
      stat = await fs.stat(fp);
    } catch (error) {
      console.warn(`WARNING: No file found at '${fp}'`);
      return `[NO SUCH FILE: '${fp}']`;
    }

    // not using binary divisions because this matches
    //   what most OSes will report for the file size.
    // Nobody knows what a mebibyte is.
    const sizeInBytes = stat.size;
    const sizeInKB = sizeInBytes / 1000;
    if (sizeInKB < 1000) {
      return `${sizeInKB.toFixed(0)} kB`;
    }
    const sizeInMB = sizeInKB / 1000;
    // not going to have any gigabyte/terabyte files here,
    //   but you see how it would proceed
    return `${sizeInMB.toFixed(1)} MB`;
  });
}

