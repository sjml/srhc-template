export default function (eleventyConfig) {
  eleventyConfig.addExtension("txt", {
    name: "raw-txt",
    compileOptions: {
      permalink: "raw"
    },
    compile: (content, _path) => {
      return (_data) => {
        return content;
      }
    }
  })
}
