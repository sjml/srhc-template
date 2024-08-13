import { EleventyHtmlBasePlugin, EleventyRenderPlugin } from "@11ty/eleventy";
import EleventyNavigation from "@11ty/eleventy-navigation";

import cacheBust from "eleventy-auto-cache-buster";

import rawText from "./src/11ty_mods/rawTextRender.js";
import shortcodes from "./src/11ty_mods/shortcodes.js"
import navFilter from "./src/11ty_mods/filterNavCollection.js";
import pandocWrapper from "./src/11ty_mods/pandocWrapper.js";
import addSectionAnchors from "./src/11ty_mods/addSectionAnchors.js";
import prettify from "./src/11ty_mods/prettifyTransform.js";
import postBuild from "./src/11ty_mods/postBuild.js";
import buildInfo from "./src/11ty_mods/buildInformation.js";


export default function(eleventyConfig) {

  // rewrites local URLs to be relative to the pathPrefix
  eleventyConfig.addPlugin(EleventyHtmlBasePlugin);
  // renderTemplate and renderFile shortcodes
  eleventyConfig.addPlugin(EleventyRenderPlugin);
  // for the table of contents
  eleventyConfig.addPlugin(EleventyNavigation);

  shortcodes(eleventyConfig);
  navFilter(eleventyConfig);
  rawText(eleventyConfig);
  pandocWrapper(eleventyConfig);
  addSectionAnchors(eleventyConfig);

  if (process.env.ENVIRONMENT === "production") {
    prettify(eleventyConfig);
    buildInfo(eleventyConfig);
    cacheBust(eleventyConfig, {
      globstring: "**/*.{css,js,png,jpg,jpeg,gif,mp4,ico,svg,pdf,epub,azw3,mobi}",
      runAsync: false,
    });
    postBuild(eleventyConfig);
  }

  eleventyConfig.setServerPassthroughCopyBehavior("passthrough");
  eleventyConfig.addPassthroughCopy({"static": "/"});
  eleventyConfig.addPassthroughCopy({"css/out/srhc.css": "/css/srhc.css"});

  eleventyConfig.setServerOptions({
    showAllHosts: true
  });

  return {
    dir: {
      input: "content",
    },
    markdownTemplateEngine: "njk",
    pathPrefix: process.env.ELEVENTY_PREFIX_PATH ? process.env.ELEVENTY_PREFIX_PATH : undefined
  };
};
