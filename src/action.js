#!/usr/bin/env node
import { analyzeEvent } from "./analyze.js";
import { loadConfig } from "./config.js";
import { applyGitHubPlan, hydrateGitHubEvent, isTruthy, readGitHubEvent, readInput } from "./github.js";
import { maybeAddOpenAiSummary } from "./openai.js";
import { appendFile } from "node:fs/promises";

async function main() {
  const mode = readInput("mode", "auto");
  const configPath = readInput("config", "maintainerkit.yml");
  const dryRun = isTruthy(readInput("dry-run", "false"));
  const config = await loadConfig(configPath);
  const token = readInput("github-token", process.env.GITHUB_TOKEN || "");
  const event = await hydrateGitHubEvent({
    event: await readGitHubEvent(),
    token,
    repository: process.env.GITHUB_REPOSITORY
  });
  const apiKey = readInput("openai-api-key", process.env.OPENAI_API_KEY || "");

  let plan = analyzeEvent(event, config, mode);
  plan = await maybeAddOpenAiSummary({
    plan,
    event,
    apiKey,
    model: process.env.OPENAI_MODEL || config.openai.model
  });

  const result = await applyGitHubPlan({
    event,
    plan,
    config,
    token,
    repository: process.env.GITHUB_REPOSITORY,
    dryRun
  });

  await writeOutputs(plan);
  console.log(JSON.stringify({ plan, result }, null, 2));
}

async function writeOutputs(plan) {
  if (!process.env.GITHUB_OUTPUT) {
    return;
  }

  const output = [
    formatOutput("plan", JSON.stringify(plan)),
    formatOutput("labels", JSON.stringify(plan.labels)),
    formatOutput("warnings", JSON.stringify(plan.warnings))
  ].join("");

  await appendFile(process.env.GITHUB_OUTPUT, output);
}

function formatOutput(name, value) {
  const delimiter = `maintainerkit_${name}_end`;
  return `${name}<<${delimiter}\n${value}\n${delimiter}\n`;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
