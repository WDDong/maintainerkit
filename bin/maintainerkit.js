#!/usr/bin/env node
import { analyzeEvent } from "../src/analyze.js";
import { loadConfig } from "../src/config.js";
import { applyGitHubPlan, hydrateGitHubEvent, isTruthy, readGitHubEvent } from "../src/github.js";
import { maybeAddOpenAiSummary } from "../src/openai.js";

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const event = await hydrateGitHubEvent({
    event: await readGitHubEvent(args.event),
    token: process.env.GITHUB_TOKEN,
    repository: process.env.GITHUB_REPOSITORY
  });
  const config = await loadConfig(args.config || "maintainerkit.yml");
  const dryRun = args.dryRun === undefined ? true : isTruthy(args.dryRun);

  let plan = analyzeEvent(event, config, args.mode || "auto");
  plan = await maybeAddOpenAiSummary({
    plan,
    event,
    apiKey: process.env.OPENAI_API_KEY,
    model: process.env.OPENAI_MODEL || config.openai.model
  });

  const result = await applyGitHubPlan({
    event,
    plan,
    config,
    token: process.env.GITHUB_TOKEN,
    repository: process.env.GITHUB_REPOSITORY,
    dryRun
  });

  console.log(JSON.stringify({ plan, result }, null, 2));
}

function parseArgs(args) {
  const parsed = {};

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    }
    if (arg === "--dry-run") {
      const next = args[index + 1];
      if (next && !next.startsWith("--")) {
        parsed.dryRun = next;
        index += 1;
      } else {
        parsed.dryRun = "true";
      }
      continue;
    }
    if (arg.startsWith("--")) {
      parsed[toCamelCase(arg.slice(2))] = args[index + 1];
      index += 1;
    }
  }

  return parsed;
}

function printHelp() {
  console.log(`MaintainerKit

Usage:
  maintainerkit --event ./event.json --config ./maintainerkit.yml --dry-run

Options:
  --event   Path to a GitHub event payload JSON file.
  --config  Path to maintainerkit.yml or maintainerkit.json.
  --mode    auto, issue, pull_request, or release.
  --dry-run Print planned actions without writing to GitHub.
`);
}

function toCamelCase(value) {
  return value.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
