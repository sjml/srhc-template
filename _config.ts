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

import postcssVars from "postcss-css-variables";

import { getGenerator } from "lume/core/utils/lume_version.ts";

import { shortcodes } from "./src/lumeMods/shortCodes.ts";
import { pandoc } from "./src/lumeMods/pandocMarkdown.ts";
import { buildInfo } from "./src/lumeMods/buildInformation.ts";
import { addSectionAnchors } from "./src/lumeMods/addSectionAnchors.ts";
import { cacheBust } from "./src/lumeMods/cacheBust.ts";
import { dprint } from "./src/lumeMods/dprintFormat.ts";

import { getImageSrcList } from "./src/util.ts";

import * as revInfo from "./src/getRevisionInfo.ts";


function getEnvBool(name: string): boolean {
	const value = Deno.env.get(name);
	return value === "1" || value?.toLowerCase() === "true" || (!!value && value === "");
}
const PRODUCTION_MODE = getEnvBool("PRODUCTION_MODE");
const FULL_MD = getEnvBool("FULL_MD");


const site = lume({
	includes: "pubs/web/layouts",
	...(PRODUCTION_MODE ? {location: new URL("https://shaneliesegang.com/projects/srhc-template")} : {})
});

site.use(filterPages({
	fn: (page) => {
		if (page.data.full_md === true && !FULL_MD) {
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

site.add("pubs/web/static", ".");
site.add("pubs/web/css/web.scss", "/css/srhc.css");
if (FULL_MD && !PRODUCTION_MODE) {
	site.add("pubs/web/css/epub.scss", "/css/srhc-epub.css");
	site.add("pubs/web/css/kindle.scss", "/css/srhc-kindle.css");
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
	plugins: (FULL_MD && !PRODUCTION_MODE) ? [postcssVars()] : [],
}));

if (PRODUCTION_MODE) {
	site.use(cacheBust({
		extensions: [
			".css", ".js", ".svg",
			".woff2", ".png", ".jpg",
			 ".pdf", ".epub", ".azw3", ".mobi"
		],
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

if (PRODUCTION_MODE) {
	if (FULL_MD) {
		site.process([".md"], async (pages) => {
			for (const page of pages) {
				if (page.data.full_md) {
					const imgs = await getImageSrcList(page.content as string);
					if (!imgs) {
						continue;
					}
					for (const imgSrc of imgs) {
						if (imgSrc.startsWith("/")) {
							page.content = (page.content as string).replaceAll(imgSrc, `${page.data.sitedata.url}${imgSrc}`);
						}
					}
				}
			}
		});
	}

	site.use(svgo({
		options: {multipass: true,},
	}));
	site.add([".svg"]);

	site.use(buildInfo());

	site.use(await dprint({
		globalConfig: {useTabs: true},
		htmlConfig: {scriptIndent: true},
	}));

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
