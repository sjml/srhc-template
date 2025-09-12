import postcssSass from "@csstools/postcss-sass";
import postcssVars from "postcss-css-variables";

export default (ctx) => { return {
  map: false,
  parser: "postcss-scss",
  plugins: [
    postcssSass({
      outputStyle: "compressed",
      silenceDeprecations: ["legacy-js-api"],
    }),
    ctx.file.basename === "web.scss" ? null : postcssVars()
  ],
}};
