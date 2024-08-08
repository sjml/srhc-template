// this was getting complicated, so moving it out of the main file

import path from "node:path";

import pandoc from "eleventy-plugin-pandoc";

const pandocMode = "direct"; // has to be either "direct" or "server"

export default function (eleventyConfig) {
  pandoc(eleventyConfig, {
    inputFormat: "markdown+implicit_header_references-implicit_figures",
    pandocInvoke: pandocMode,
    compileOptionsPermalink: true,
    pandocOptions: (env) => {
      let opts =  {
        wrap: "none",
        "section-divs": true,
        "shift-heading-level-by": env.fullPageRender ? 2 : 0,
        "highlight-style": "pygments",
        "syntax-definition": path.join("resources", "syntax-highlighting", "pymod", "pymod.xml"),
        to: env.fullPageRender ? "markdown" : "html",
      };
      let idPrefix;
      if (pandocMode == "server") {
        idPrefix = "identifier-prefix";
      }
      else if (pandocMode == "direct") {
        idPrefix = "id-prefix";
      }
      opts[idPrefix] = env.fullPageRender ? env.fnId : "";
      return opts;
    },
  });
}
