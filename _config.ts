import lume from "lume/mod.ts";

import basePath from "lume/plugins/base_path.ts";
import inline from "lume/plugins/inline.ts";
import sass from "lume/plugins/sass.ts";
import nav from "lume/plugins/nav.ts";
import filterPages from "lume/plugins/filter_pages.ts";
import svgo from "lume/plugins/svgo.ts";
import brotli from "lume/plugins/brotli.ts";
import gzip from "lume/plugins/gzip.ts";
import postcss from "lume/plugins/postcss.ts";

import postcssVars from "npm:postcss-css-variables@^0.19.0";

import { getGenerator } from "lume/core/utils/lume_version.ts";

import { shortcodes } from "./src/lumeMods/shortCodes.ts";
import { pandoc } from "./src/lumeMods/pandocMarkdown.ts";
import { buildInfo } from "./src/lumeMods/buildInformation.ts";
import { addSectionAnchors } from "./src/lumeMods/addSectionAnchors.ts";
import { cacheBust } from "./src/lumeMods/cacheBust.ts";

import * as revInfo from "./src/getRevisionInfo.ts";

const site = lume({
	includes: "./layouts",
	...(Deno.env.get("PRODUCTION_MODE") === "1" ? {location: new URL("https://shaneliesegang.com/projects/srhc-lume")} : {})
});

site.use(filterPages({
	fn: (page) => {
		const envMD = Deno.env.get("FULL_MD");
		if (page.data.full_md === true && (!envMD || envMD === "0")) {
			return false;
		}
		return true;
	},
	beforeRender: true,
}));

site.ignore("README.md");
site.ignore("tmp");
site.ignore("notes");
site.ignore("resources");
site.ignore("pubs");

site.add("static", ".");
site.add("css/web.scss", "/css/srhc.css");
if (Deno.env.get("FULL_MD") === "1") {
	site.add("css/epub.scss", "/css/srhc-epub.css");
	site.add("css/kindle.scss", "/css/srhc-kindle.css");
}

site.data("layout", "page.vto");
site.data("generatorString", getGenerator());
site.data("revisionStringFull", revInfo.getRevisionString());
site.data("revisionStringShort", revInfo.getRevisionString(true));
site.data("revisionDateString", revInfo.getRevisionDate());

site.use(sass({
	includes: "css",
}));
site.use(postcss({
	useDefaultPlugins: false,
	plugins: Deno.env.get("FULL_MD") === "1" ? [postcssVars()] : [],
}));

if (Deno.env.get("PRODUCTION_MODE") === "1") {
	site.use(cacheBust({
		extensions: [".css", ".js", ".png", ".svg", ".jpg", ".pdf", ".epub", ".azw3", ".mobi", ".woff2"],
		// logSkips: true,
	}));
}
site.use(basePath());

site.use(inline());
site.use(nav({
	order: "order=asc"
}));

site.use(shortcodes());
site.use(pandoc({
	inputFormat: "markdown+implicit_header_references-implicit_figures",
	otherArgs: [
		"--wrap",                   "none",
		"--section-divs",
		"--syntax-highlighting",    "pygments",
		"--syntax-definition",      "resources/syntax-highlighting/pymod/pymod.xml",
	]
}));

site.parseBasename((basename) => {
	const match = basename.match(/(\d+)\.\s*(.+)/);
	if (match) {
		const [, order, basename] = match;

		return {
			order: parseInt(order),
			basename,
		};
	}
});

site.use(addSectionAnchors());

if (Deno.env.get("PRODUCTION_MODE") === "1") {
	site.use(svgo({
		options: {multipass: true,},
	}));
	site.add([".svg"]);

	site.use(buildInfo());

	const compressionData = JSON.parse(Deno.readTextFileSync("_data/compression.json"));
	const compressionExtensions = (compressionData.compressibleFiles as [string, string][]).map(([ext, _mime]) => `.${ext}`);
	site.use(brotli({
		extensions: compressionExtensions,
		quality: 11,
	}));
	site.use(gzip({
		extensions: compressionExtensions,
	}));
}


export default site;
