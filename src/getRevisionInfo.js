import * as child_process from "node:child_process";


export function getRevisionString(short = false) {
  let args = ["rev-parse", "HEAD"];
  if (short) {
    args.splice(1, 0, "--short");
  }
  const gitInfo = child_process.spawnSync("git", args);

  if (gitInfo.status != 0) {
    console.error(gitInfo.stderr.toString("utf-8"));
    return null;
  }

  return gitInfo.stdout.toString("utf-8").trim();
}

export function getRevisionDate() {
  const gitInfo = child_process.spawnSync("git", ["show", "-s", "--format=%at"]);

  if (gitInfo.status != 0) {
    console.error(gitInfo.stderr.toString("utf-8"));
    return null;
  }

  const tsString = gitInfo.stdout.toString("utf-8").trim();
  const timestamp = parseInt(tsString);
  const date = new Date(timestamp * 1000);
  return date.toISOString().slice(0,-5)+"Z";
}


if (import.meta.url === `file://${process.argv[1]}`) {
  if (process.argv[2] == "rev") {
    console.log(getRevisionString());
  }
  else if (process.argv[2] == "revShort") {
    console.log(getRevisionString(true));
  }
  else if (process.argv[2] == "date") {
    console.log(getRevisionDate());
  }
  else {
    console.log(getRevisionString());
    console.log(getRevisionString(true));
    console.log(getRevisionDate());
  }
}
