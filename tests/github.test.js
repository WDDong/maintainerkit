import test from "node:test";
import assert from "node:assert/strict";
import {
  applyGitHubPlan,
  hydrateGitHubEvent,
  resetFetchImplementation,
  setFetchImplementation
} from "../src/github.js";
import { defaultConfig } from "../src/defaults.js";

test("hydrates pull request file details from GitHub API", async () => {
  const calls = mockFetch([
    {
      status: 200,
      body: [
        { filename: ".github/workflows/ci.yml", status: "modified", additions: 4, deletions: 1, changes: 5 }
      ]
    }
  ]);

  const event = await hydrateGitHubEvent({
    event: { pull_request: { number: 12, title: "Update workflow" } },
    token: "token",
    repository: "WDDong/maintainerkit"
  });

  assert.equal(event.pull_request.changed_files, 1);
  assert.deepEqual(event.pull_request.changed_files_detail, [
    { filename: ".github/workflows/ci.yml", status: "modified", additions: 4, deletions: 1, changes: 5 }
  ]);
  assert.match(calls[0].url, /\/repos\/WDDong\/maintainerkit\/pulls\/12\/files/);
  resetFetchImplementation();
});

test("creates missing labels and updates an existing MaintainerKit comment", async () => {
  const calls = mockFetch([
    { status: 404, body: { message: "Not Found" } },
    { status: 201, body: { name: "needs-tests" } },
    { status: 200, body: [] },
    { status: 200, body: [{ id: 99, body: "## MaintainerKit PR review\n\nOld body" }] },
    { status: 200, body: { id: 99 } }
  ]);

  const result = await applyGitHubPlan({
    event: { pull_request: { number: 12 } },
    plan: {
      labels: ["needs-tests"],
      comment: "## MaintainerKit PR review\n\nNew body"
    },
    config: defaultConfig,
    token: "token",
    repository: "WDDong/maintainerkit",
    dryRun: false
  });

  assert.equal(result.dryRun, false);
  assert.equal(calls[0].options.method, "GET");
  assert.match(calls[0].url, /\/labels\/needs-tests$/);
  assert.equal(calls[1].options.method, "POST");
  assert.match(calls[1].url, /\/labels$/);
  assert.equal(calls[2].options.method, "POST");
  assert.match(calls[2].url, /\/issues\/12\/labels$/);
  assert.equal(calls[4].options.method, "PATCH");
  assert.match(calls[4].url, /\/issues\/comments\/99$/);
  resetFetchImplementation();
});

test("honors labels and comments action switches", async () => {
  const calls = mockFetch([]);
  const config = {
    ...defaultConfig,
    actions: {
      ...defaultConfig.actions,
      labels: false,
      comments: false
    }
  };

  const result = await applyGitHubPlan({
    event: { issue: { number: 42 } },
    plan: {
      labels: ["bug"],
      comment: "## MaintainerKit triage\n\nBody"
    },
    config,
    token: "token",
    repository: "WDDong/maintainerkit",
    dryRun: false
  });

  assert.deepEqual(result.actions, []);
  assert.deepEqual(calls, []);
  resetFetchImplementation();
});

function mockFetch(responses) {
  const calls = [];

  setFetchImplementation(async (url, options) => {
    calls.push({ url, options });
    const next = responses.shift();
    if (!next) {
      throw new Error(`No mock response for ${options.method} ${url}`);
    }
    return {
      ok: next.status >= 200 && next.status < 300,
      status: next.status,
      text: async () => JSON.stringify(next.body),
      json: async () => next.body
    };
  });

  return calls;
}
