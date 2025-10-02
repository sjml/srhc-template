import type Site from "lume/core/site.ts";
import Cache from "lume/core/cache.ts";
import { merge } from "lume/core/utils/object.ts";

import { type FormatRequest, createFromBuffer, GlobalConfiguration } from "@dprint/formatter";

// hardcoding this stuff; not meant to be a general-purpose formatter, just for HTML w/script
const HTML_MODULE_URL = "https://plugins.dprint.dev/g-plane/markup_fmt-v0.24.0.wasm";
const SCRIPT_MODULE_URL = "https://plugins.dprint.dev/typescript-0.95.11.wasm";

export interface Options {
	globalConfig?: GlobalConfiguration,
	htmlConfig?: Record<string, unknown>,
	scriptConfig?: Record<string, unknown>,
};

export const defaults: Options = {
	globalConfig: {},
	htmlConfig: {},
	scriptConfig: {},
};

async function getModule(url: string, cache: Cache): Promise<Uint8Array> {
	let bytes = await cache.getBytes([url]);
	if (!bytes) {
		const resp = await fetch(url);
		if (!resp.ok) {
			throw new Error(`Could not fetch ${url}`);
		}
		bytes = await resp.bytes();
		await cache.set([url], bytes);
	}
	return bytes;
}

export async function dprint(userOptions?: Partial<Options>) {
	const options = merge(defaults, userOptions);
	const cache = new Cache({folder: "_cache"});

	const htmlModuleBytes = await getModule(HTML_MODULE_URL, cache);
	const scriptModuleBytes = await getModule(SCRIPT_MODULE_URL, cache);

	const htmlFormatter = createFromBuffer(new Uint8Array(htmlModuleBytes));
	htmlFormatter.setConfig(options.globalConfig, options.htmlConfig);
	const scriptFormatter = createFromBuffer(new Uint8Array(scriptModuleBytes));
	scriptFormatter.setConfig(options.globalConfig, options.scriptConfig);

	return (site: Site) => {
		site.process([".html"], (pages) => {
			for (const page of pages) {
				const formatted = htmlFormatter.formatText({
					filePath: "input.html",
					fileText: page.content,
				}, (req: FormatRequest) => {
					if (req.filePath.endsWith(".js")) {
						return scriptFormatter.formatText(req);
					}
				});
				page.content = formatted;
			}
		});
	};
}
