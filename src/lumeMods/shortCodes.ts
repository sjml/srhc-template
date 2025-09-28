import type Site from "lume/core/site.ts";

export function shortcodes() {
	return (site: Site) => {
		site.filter("getFileSize", (fpath: string) => {
			let stat: Deno.FileInfo;
			try {
				stat = Deno.statSync(fpath);
			}
			catch (_) {
				console.warn(`WARNING: No file found at '${fpath}'`);
				return `[NO SUCH FILE: ${fpath}]`;
			}

				// not using binary divisions because this matches
				//   what most OSes will report for the file size.
				// Nobody knows what a mebibyte is.
				const sizeInBytes = stat.size;
				const sizeInKB = sizeInBytes / 1000;
				if (sizeInKB < 1000) {
					return `${sizeInKB.toFixed(0)} kB`;
				}
				const sizeInMB = sizeInKB / 1000;
				// not going to have any gigabyte/terabyte files here,
				//   but you see how it would proceed
				return `${sizeInMB.toFixed(1)} MB`;
		});
	};
}
