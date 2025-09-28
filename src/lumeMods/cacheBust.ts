import { extname } from "@std/path";

import type Site from "lume/core/site.ts";
import { Page } from "lume/core/file.ts";
import { merge } from "lume/core/utils/object.ts";
import modifyUrls from "lume/plugins/modify_urls.ts";
import { encodeHex } from "lume/deps/hex.ts";

export interface Options {
	extensions: string[];
	hashLength: number;
	logSkips: boolean;
}

export const defaults: Options = {
	extensions: [".css", ".js"],
	hashLength: 10,
	logSkips: false,
}

export function cacheBust(userOptions?: Partial<Options>) {
	const options = merge(defaults, userOptions);

	return (site: Site) => {
		const cache = new Map<string, string>();
		const skips = new Map<string, boolean>();

		site.use(modifyUrls({fn: replaceUrl}));

		async function replaceUrl(url: string|null, _page: Page, element?: Element) {
			if (!url) {
				return "";
			}
			if (!(url.startsWith("/") || (url.startsWith("."))) || url.endsWith("/")) {
				return url;
			}
			if (!options.extensions.includes(extname(url))) {
				if (options.logSkips) {
					if (!skips.has(url)) {
						console.info(`INFO: Not cache-busting for ${url}`);
						skips.set(url, true);
					}
				}
				return url;
			}
			if (element && element.hasAttribute("inline")) {
				if (options.logSkips) {
					if (!skips.has(url)) {
						console.info(`INFO: Not cache-busting for inlined ${url}`);
						skips.set(url, true);
					}
				}
				return url;
			}

			const hash = await getFileHash(url);

			return `${url}?v=${hash}`;
		}

		async function getFileHash(url: string): Promise<string> {
			if (cache.has(url)) {
				return cache.get(url)!;
			}

			const contentLike = await site.getContent(url, true);
			if (!contentLike) {
				throw new Error(`Couldn't find file: "${url}"`);
			}
			const content = new Uint8Array(contentLike);
			const hashBuffer = await crypto.subtle.digest("SHA-1", content);
			const fullHash = encodeHex(new Uint8Array(hashBuffer));
			const hash = fullHash.substring(0, options.hashLength);

			cache.set(url, hash);
			return hash;
		}
	}
}
