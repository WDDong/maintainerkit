import test from "node:test";
import assert from "node:assert/strict";
import { analyzeIssue, analyzePullRequest, analyzeRelease } from "../src/analyze.js";
import { defaultConfig } from "../src/defaults.js";

test("labels bug reports and requests reproduction details", () => {
  const result = analyzeIssue({
    title: "Crash on startup",
    body: "The command fails with an exception."
  }, defaultConfig);

  assert.equal(result.kind, "issue");
  assert.deepEqual(new Set(result.labels), new Set(["bug", "needs-repro"]));
  assert.match(result.comment, /Bug report is missing clear reproduction details/);
});

test("flags security issue language", () => {
  const result = analyzeIssue({
    title: "Possible token leak",
    body: "A secret may be exposed in logs."
  }, defaultConfig);

  assert.ok(result.labels.includes("security"));
  assert.ok(result.warnings.includes("Security-related language detected"));
});

test("flags pull requests without tests and sensitive path changes", () => {
  const result = analyzePullRequest({
    title: "Change workflow",
    changed_files: 2,
    additions: 20,
    changed_files_detail: [
      { filename: ".github/workflows/ci.yml", additions: 10 },
      { filename: "src/action.js", additions: 10 }
    ]
  }, defaultConfig);

  assert.deepEqual(new Set(result.labels), new Set(["needs-tests", "needs-maintainer-review"]));
  assert.match(result.comment, /\.github\/workflows\/ci\.yml/);
});

test("does not flag tests when test paths changed", () => {
  const result = analyzePullRequest({
    title: "Add parser tests",
    changed_files_detail: [
      { filename: "src/config.js", additions: 10 },
      { filename: "test/config.test.js", additions: 30 }
    ]
  }, defaultConfig);

  assert.equal(result.labels.includes("needs-tests"), false);
});

test("creates release checklist", () => {
  const result = analyzeRelease({
    tag_name: "v1.0.0",
    body: "Short notes"
  }, defaultConfig);

  assert.equal(result.kind, "release");
  assert.match(result.comment, /release checklist/i);
  assert.ok(result.warnings.includes("Release notes may be incomplete"));
});
