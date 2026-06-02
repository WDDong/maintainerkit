import test from "node:test";
import assert from "node:assert/strict";
import { parseSimpleYaml } from "../src/config.js";
import { defaultConfig, mergeConfig } from "../src/defaults.js";

test("parses nested objects and lists from maintainerkit yaml", () => {
  const parsed = parseSimpleYaml(`
project:
  name: Example
labels:
  bug: bug
review:
  maxChangedFiles: 10
  sensitivePaths:
    - package.json
    - .github/workflows/
`);

  assert.equal(parsed.project.name, "Example");
  assert.equal(parsed.labels.bug, "bug");
  assert.equal(parsed.review.maxChangedFiles, 10);
  assert.deepEqual(parsed.review.sensitivePaths, ["package.json", ".github/workflows/"]);
});

test("merges action switches with defaults", () => {
  const merged = mergeConfig(defaultConfig, {
    actions: {
      comments: false
    }
  });

  assert.equal(merged.actions.labels, true);
  assert.equal(merged.actions.comments, false);
  assert.equal(merged.actions.createLabels, true);
});
