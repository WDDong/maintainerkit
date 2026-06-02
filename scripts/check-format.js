#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";

const files = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard"], { encoding: "utf8" })
  .split("\n")
  .filter(Boolean)
  .filter((file) => !file.startsWith(".git/"));

const failures = [];

for (const file of files) {
  const content = await readFile(file, "utf8");
  if (/[ \t]$/m.test(content)) {
    failures.push(`${file}: trailing whitespace`);
  }
  if (!content.endsWith("\n")) {
    failures.push(`${file}: missing final newline`);
  }
}

if (failures.length) {
  console.error(failures.join("\n"));
  process.exitCode = 1;
}
