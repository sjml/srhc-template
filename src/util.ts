import { join, dirname, fromFileUrl } from "@std/path";

const __dirname = dirname(fromFileUrl(import.meta.url));

const ROOT_PATH = join(__dirname, "..");

export async function getImageSrcList(markdown: string): Promise<string[]|undefined> {
	const imgSrcListCmd = new Deno.Command("pandoc", {
		args: [
			"--from", "markdown+implicit_header_references-implicit_figures",
			"--to", "json", // dummy output; will be discarded
			"--lua-filter", join(ROOT_PATH, "src", "pandocFilters", "getImageList.lua"),
			"-o", "/dev/null"
		],
		stdin: "piped",
		stdout: "piped",
		stderr: "piped",
	});
	const imgSrcList = imgSrcListCmd.spawn();
	const imgSrcListWriter = imgSrcList.stdin.getWriter();
	await imgSrcListWriter.write(new TextEncoder().encode(markdown));
	await imgSrcListWriter.close();
	const imgSrcListResult = await imgSrcList.output();
	if (!imgSrcListResult.success) {
		console.error(`PANDOC ERROR: ${new TextDecoder().decode(imgSrcListResult.stderr)}`);
		return undefined;
	}
	const srcListText = new TextDecoder().decode(imgSrcListResult.stdout);
	return srcListText.split("\n");
}
