import { Window } from 'happy-dom';

function range(size, startAt = 0) {
  return [...Array(size).keys()].map(i => i + startAt);
}

export default function (eleventyConfig) {
  eleventyConfig.addTransform("html-add-section-anchors", async function (content, outputPath) {
    if (outputPath && outputPath.endsWith(".html")) {
      const window = new Window();
      const dp = new window.DOMParser();
      const dom = dp.parseFromString(content, "text/html");
      range(5, 2).forEach(level => {
        const sections = dom.querySelectorAll(`section.level${level}`);
        sections.forEach(section => {
          const header = section.querySelector(`> h${level}:first-child`);
          const anchor = dom.createElement("a");
          anchor.className = "header-anchor";
          anchor.href = `#${section.id}`;
          anchor.attributes["aria-hidden"] = "true";
          anchor.innerHTML = "§";
          header.appendChild(anchor);
        });
      });
      return `<!doctype html>\n${dom.documentElement.outerHTML}`;
    }
    return content;
  });
}
