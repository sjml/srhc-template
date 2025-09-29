import type Site from "lume/core/site.ts";
import { Page } from "lume/core/file.ts";
import { getCurrentVersion } from "lume/core/utils/lume_version.ts";

import * as versionInfo from "../getRevisionInfo.ts";

async function readJsonFile(filePath: string) {
	const contents = await Deno.readTextFile(filePath);
	const data = JSON.parse(contents);
	return data;
};

async function runProgram(command: string, args: string[], versionRegex: RegExp|null) {
	const cmd = new Deno.Command(command, {args});
	const result = await cmd.output();
	let stdout = new TextDecoder().decode(result.stdout);
	if (args[args.length-1] == "2>&1") {
		stdout = new TextDecoder().decode(result.stderr); // silly gzip
	}

	if (versionRegex) {
		const resMatch = stdout.match(versionRegex);
		if (resMatch === null) {
			throw new Error(`Version regex for ${command} didn't find anything in output`);
		}
		return resMatch[1];
	}
	else {
		return stdout.trim();
	}
}

export function buildInfo() {
	return (site: Site) => {
		site.addEventListener("afterRender", async (_) => {
			console.log("Stamping build information...");
			// deno-lint-ignore no-explicit-any
			const output: any = {};

			output.systemInfo = await runProgram("uname", ["-a"], null);
			output.buildTimestamp = (new Date()).toISOString().slice(0,-5)+"Z";
			output.revisionTimestamp = versionInfo.getRevisionDate();
			output.localGitRevision = versionInfo.getRevisionString();

			output.softwareVersions = {};
			output.softwareVersions.deno = await runProgram("deno", ["--version"], /deno (.*) \(/);
			output.softwareVersions.lume = getCurrentVersion().slice(1);
			output.softwareVersions.git = await runProgram("git", ["--version"], /version (.*)\n/);
			output.softwareVersions.pandoc = await runProgram("pandoc", ["--version"], /^pandoc (.*)\n/);
			output.softwareVersions.tectonic = await runProgram("tectonic", ["--version"], /Tectonic (.*)\n/);
			output.softwareVersions.rsvgConvert = await runProgram("rsvg-convert", ["--version"], /version (.*)\n/);
			output.softwareVersions.imageMagick = await runProgram("convert", ["--version"], /Version: (.*) https/);
			output.softwareVersions.ghostscript = await runProgram("gs", ["--version"], null);
			output.softwareVersions.calibre = await runProgram("ebook-convert", ["--version"], /calibre ([\d.]*)/)
			output.softwareVersions.epubcheck = await runProgram("epubcheck", ["--version", "--quiet"], / v(.*)\n/);
			output.softwareVersions.gzip = await runProgram("gzip", ["--version", "2>&1"], null);
			output.softwareVersions.brotli = await runProgram("brotli", ["--version"], /brotli (.*)\n/);
			output.softwareVersions.zip = await runProgram("zip", ["--version"], /This is Zip ([\d\.]*)/)
			output.softwareVersions.unzip = await runProgram("unzip", ["-v"], /UnZip ([\d\.]*)/)

			output.denoPackages = await readJsonFile("./deno.lock");

			const recordPage = Page.create({
				url: "/buildRecord.json",
				content: JSON.stringify(output, null, "\t"),
			});
			site.pages.push(recordPage);
		});
	};
}
