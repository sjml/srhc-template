import prettier from "prettier";
import xmlFormat from "xml-formatter";

export default (eleventyConfig) => {
  eleventyConfig.addTransform("html-prettify", async function (content, outputPath) {
    if (outputPath && outputPath.endsWith(".html")) {
      return await prettier.format(content, {
        tabWidth: 2,
        parser: "html",
        printWidth: 100,
      });
    }
    else if (outputPath && outputPath.endsWith(".xml")) {
      return xmlFormat(content, {
        collapseContent: true,
        indentation: "  ",
      });
    }

    return content;
  });
};
