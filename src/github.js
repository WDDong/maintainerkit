import { readFile } from "node:fs/promises";

export async function readGitHubEvent(eventPath = process.env.GITHUB_EVENT_PATH) {
  if (!eventPath) {
    throw new Error("GITHUB_EVENT_PATH is not set. Pass --event when using the CLI.");
  }
  return JSON.parse(await readFile(eventPath, "utf8"));
}

export function readInput(name, fallback = "") {
  const envName = `INPUT_${name.replace(/ /g, "_").replace(/-/g, "_").toUpperCase()}`;
  return process.env[envName] || fallback;
}

export function isTruthy(value) {
  return ["1", "true", "yes", "on"].includes(String(value).toLowerCase());
}

export async function applyGitHubPlan({ event, plan, token, repository, dryRun }) {
  const target = resolveCommentTarget(event);
  const actions = [];

  if (plan.labels.length && target?.number) {
    actions.push({
      type: "labels",
      labels: plan.labels,
      number: target.number
    });
  }

  if (plan.comment && target?.number) {
    actions.push({
      type: "comment",
      body: plan.comment,
      number: target.number
    });
  }

  if (dryRun || !token || !repository) {
    return {
      dryRun: true,
      actions
    };
  }

  for (const action of actions) {
    if (action.type === "labels") {
      await githubRequest({
        method: "POST",
        path: `/repos/${repository}/issues/${action.number}/labels`,
        token,
        body: { labels: action.labels }
      });
    }

    if (action.type === "comment") {
      await githubRequest({
        method: "POST",
        path: `/repos/${repository}/issues/${action.number}/comments`,
        token,
        body: { body: action.body }
      });
    }
  }

  return {
    dryRun: false,
    actions
  };
}

export async function githubRequest({ method, path, token, body }) {
  const response = await fetch(`https://api.github.com${path}`, {
    method,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "X-GitHub-Api-Version": "2022-11-28"
    },
    body: body ? JSON.stringify(body) : undefined
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`GitHub API ${method} ${path} failed: ${response.status} ${text}`);
  }

  return response.status === 204 ? null : response.json();
}

function resolveCommentTarget(event) {
  if (event.issue && !event.issue.pull_request) {
    return { number: event.issue.number };
  }
  if (event.pull_request) {
    return { number: event.pull_request.number };
  }
  if (event.release) {
    return null;
  }
  return null;
}
