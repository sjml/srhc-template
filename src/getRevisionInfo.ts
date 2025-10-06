export function getRevisionString(short: boolean = false): string|null {
	const args = ["rev-parse", "HEAD"];
	if (short) {
		args.splice(1, 0, "--short");
	}
	const gitInfoCmd = new Deno.Command("git", {args});
	const gitInfo = gitInfoCmd.outputSync();

	if (!gitInfo.success) {
		console.error(new TextDecoder().decode(gitInfo.stderr));
		return null;
	}

	return new TextDecoder().decode(gitInfo.stdout).trim();
}

export function getRevisionDate(): string|null {
	const gitInfoCmd = new Deno.Command("git", {args: ["show", "-s", "--format=%at"]});
	const gitInfo = gitInfoCmd.outputSync();

	if (!gitInfo.success) {
		console.error(new TextDecoder().decode(gitInfo.stderr));
		return null;
	}

	const tsString = new TextDecoder().decode(gitInfo.stdout).trim();
	const timestamp = parseInt(tsString);
	const date = new Date(timestamp * 1000);
	return date.toISOString().slice(0,-5)+"Z";
}

if (import.meta.main) {
	if (Deno.args[0] == "rev") {
		console.log(getRevisionString());
	}
	else if (Deno.args[0] == "revShort") {
		console.log(getRevisionString(true));
	}
	else if (Deno.args[0] == "date") {
		console.log(getRevisionDate());
	}
	else {
		console.log(getRevisionString());
		console.log(getRevisionString(true));
		console.log(getRevisionDate());
	}
}

