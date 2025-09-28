import { merge } from "lume/core/utils/object.ts";
import type { Engine } from "lume/core/renderer.ts";
import type Site from "lume/core/site.ts";

export interface Options {
	inputFormat?: string,
	outputFormat?: string,
	otherArgs?: string[],
}

export const defaults: Options = {
	inputFormat: "commonmark",
	outputFormat: "html",
	otherArgs: [],
}

async function pandocRender(content: string, options: Options, _data?: Record<string, unknown>): Promise<string | undefined> {
	const args = [
		"--from", options.inputFormat!,
		"--to", options.outputFormat!,
		...(options.otherArgs ?? [])
	];

	const cmd = new Deno.Command("pandoc", {
		args: args,
		stdin: "piped",
		stdout: "piped",
	});

	const proc = cmd.spawn();

	const inputWriter = proc.stdin.getWriter();
	await inputWriter.write(new TextEncoder().encode(content));
	inputWriter.releaseLock();
	await proc.stdin.close();

	const result = await proc.output();

	if (!result.success) {
		const err = new TextDecoder().decode(result.stderr);
		console.error(`PANDOC ERROR: ${err}`);
		return undefined;
	}

	return new TextDecoder().decode(result.stdout);
}

export class PandocEngine implements Engine {
	options: Options;

	constructor(options: Options = {}) {
		this.options = merge(defaults, options);
	}

	addHelper(): void {}

	deleteCache(): void {}

	render(content: unknown, data?: Record<string, unknown>, _filename?: string): string | Promise<string> {
		if (typeof content !== "string") {
			content = String(content);
		}

		const opts = structuredClone(this.options);
		if (data?.pandocArgs) {
			if (!opts.otherArgs) {
				opts.otherArgs = data.pandocArgs as string[];
			}
			else {
				opts.otherArgs = opts.otherArgs.concat(data.pandocArgs as string[]);
			}
		}

		return pandocRender(content as string, opts).then(res => {
			return String(res);
		})
	}
}

export function pandoc(userOptions?: Options) {
	return (site: Site) => {
		const options = merge(defaults, userOptions);
		const engine = new PandocEngine(options);

		site.loadPages([".md"], {
			engine: engine,
		});

		site.filter("pandoc", filter, true);

		async function filter(string: string, data?: Record<string, unknown>): Promise<string> {
			const datums = { ...site.scopedData.get("/"), ...data};
			const output = await engine.render(string, datums);
			return output;
		}
	}
}
