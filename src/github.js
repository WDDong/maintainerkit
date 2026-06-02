import { readFile } from "node:fs/promises";

let fetchImpl = globalThis.fetch;

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

export async function hydrateGitHubEvent({ event, token, repository }) {
  if (!event.pull_request || !token || !repository) {
    return event;
  }

  const files = await listPullRequestFiles({
    token,
    repository,
    pullNumber: event.pull_request.number
  });

  return {
    ...event,
    pull_request: {
      ...event.pull_request,
      changed_files_detail: files,
      changed_files: event.pull_request.changed_files ?? files.length
    }
  };
}

export async function listPullRequestFiles({ token, repository, pullNumber }) {
  const files = [];
  let page = 1;

  while (page <= 10) {
    const pageFiles = await githubRequest({
      method: "GET",
      path: `/repos/${repository}/pulls/${pullNumber}/files?per_page=100&page=${page}`,
      token
    });

    files.push(...pageFiles);
    if (pageFiles.length < 100) {
      break;
    }
    page += 1;
  }

  return files.map((file) => ({
    filename: file.filename,
    status: file.status,
    additions: file.additions,
    deletions: file.deletions,
    changes: file.changes
  }));
}

export async function applyGitHubPlan({ event, plan, config, token, repository, dryRun }) {
  const target = resolveCommentTarget(event);
  const actions = [];

  if (config.actions.labels && plan.labels.length && target?.number) {
    actions.push({
      type: "labels",
      labels: plan.labels,
      number: target.number
    });
  }

  if (config.actions.comments && plan.comment && target?.number) {
    actions.push({
      type: "upsert-comment",
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
      if (config.actions.createLabels) {
        await ensureLabels({
          token,
          repository,
          labels: action.labels,
          definitions: config.labelDefinitions
        });
      }

      await githubRequest({
        method: "POST",
        path: `/repos/${repository}/issues/${action.number}/labels`,
        token,
        body: { labels: action.labels }
      });
    }

    if (action.type === "upsert-comment") {
      await upsertMaintainerKitComment({
        token,
        repository,
        number: action.number,
        body: action.body
      });
    }
  }

  return {
    dryRun: false,
    actions
  };
}

export async function ensureLabels({ token, repository, labels, definitions }) {
  for (const label of labels) {
    await ensureLabel({
      token,
      repository,
      name: label,
      definition: definitions[label] || {}
    });
  }
}

export async function ensureLabel({ token, repository, name, definition }) {
  try {
    await githubRequest({
      method: "GET",
      path: `/repos/${repository}/labels/${encodeURIComponent(name)}`,
      token
    });
    return;
  } catch (error) {
    if (!isNotFound(error)) {
      throw error;
    }
  }

  await githubRequest({
    method: "POST",
    path: `/repos/${repository}/labels`,
    token,
    body: {
      name,
      color: definition.color || "ededed",
      description: definition.description || "Created by MaintainerKit"
    }
  });
}

export async function upsertMaintainerKitComment({ token, repository, number, body }) {
  const existing = await findMaintainerKitComment({ token, repository, number });

  if (existing) {
    return githubRequest({
      method: "PATCH",
      path: `/repos/${repository}/issues/comments/${existing.id}`,
      token,
      body: { body }
    });
  }

  return githubRequest({
    method: "POST",
    path: `/repos/${repository}/issues/${number}/comments`,
    token,
    body: { body }
  });
}

export async function findMaintainerKitComment({ token, repository, number }) {
  let page = 1;

  while (page <= 10) {
    const comments = await githubRequest({
      method: "GET",
      path: `/repos/${repository}/issues/${number}/comments?per_page=100&page=${page}`,
      token
    });

    const existing = comments.find((comment) => isMaintainerKitComment(comment.body || ""));
    if (existing) {
      return existing;
    }

    if (comments.length < 100) {
      break;
    }
    page += 1;
  }

  return null;
}

export function isMaintainerKitComment(body) {
  return body.includes("## MaintainerKit triage") ||
    body.includes("## MaintainerKit PR review") ||
    body.includes("## MaintainerKit release checklist");
}

export async function githubRequest({ method, path, token, body }) {
  const response = await fetchImpl(`https://api.github.com${path}`, {
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
    throw new GitHubApiError({ method, path, status: response.status, text });
  }

  return response.status === 204 ? null : response.json();
}

export function isNotFound(error) {
  return error instanceof GitHubApiError && error.status === 404;
}

export class GitHubApiError extends Error {
  constructor({ method, path, status, text }) {
    super(`GitHub API ${method} ${path} failed: ${status} ${text}`);
    this.name = "GitHubApiError";
    this.method = method;
    this.path = path;
    this.status = status;
    this.text = text;
  }
}

export function setFetchImplementation(nextFetch) {
  fetchImpl = nextFetch;
}

export function resetFetchImplementation() {
  fetchImpl = globalThis.fetch;
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
