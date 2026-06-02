const issueSignals = {
  bug: ["bug", "crash", "error", "exception", "broken", "fails", "failed", "regression"],
  feature: ["feature", "enhancement", "request", "support", "add", "proposal"],
  question: ["question", "how do i", "how to", "help", "usage", "docs"],
  security: ["security", "vulnerability", "cve", "xss", "csrf", "rce", "injection", "secret", "token leak"]
};

const reproSignals = ["steps to reproduce", "reproduction", "minimal repro", "expected", "actual"];

export function analyzeEvent(event, config, mode = "auto") {
  const resolvedMode = resolveMode(event, mode);

  if (resolvedMode === "issue") {
    return analyzeIssue(event.issue, config);
  }

  if (resolvedMode === "pull_request") {
    return analyzePullRequest(event.pull_request, config);
  }

  if (resolvedMode === "release") {
    return analyzeRelease(event.release, config);
  }

  return {
    kind: "unknown",
    labels: [],
    summary: "MaintainerKit did not recognize this GitHub event.",
    comment: "MaintainerKit did not recognize this GitHub event. No actions were planned.",
    warnings: ["Unsupported event payload"]
  };
}

export function resolveMode(event, requestedMode = "auto") {
  if (requestedMode !== "auto") {
    return requestedMode;
  }
  if (event.issue && !event.issue.pull_request) return "issue";
  if (event.pull_request) return "pull_request";
  if (event.release) return "release";
  return "unknown";
}

export function analyzeIssue(issue, config) {
  if (!issue) {
    throw new Error("Issue payload is missing.");
  }

  const text = normalize(`${issue.title || ""}\n${issue.body || ""}`);
  const labels = new Set();
  const reasons = [];

  for (const [kind, signals] of Object.entries(issueSignals)) {
    if (signals.some((signal) => text.includes(signal))) {
      labels.add(config.labels[kind]);
      reasons.push(`Detected ${kind} language.`);
    }
  }

  if (!labels.size) {
    labels.add(config.labels.question);
    reasons.push("Defaulted to question because no stronger signal was found.");
  }

  if (labels.has(config.labels.bug) && !reproSignals.some((signal) => text.includes(signal))) {
    labels.add(config.labels.needsRepro);
    reasons.push("Bug report is missing clear reproduction details.");
  }

  return {
    kind: "issue",
    labels: [...labels],
    summary: summarizeReasons("Issue triage", reasons),
    comment: buildIssueComment(issue, reasons),
    warnings: labels.has(config.labels.security) ? ["Security-related language detected"] : []
  };
}

export function analyzePullRequest(pr, config) {
  if (!pr) {
    throw new Error("Pull request payload is missing.");
  }

  const labels = new Set();
  const reasons = [];
  const files = Array.isArray(pr.changed_files_detail) ? pr.changed_files_detail : [];
  const fileNames = files.map((file) => file.filename || "");
  const changedFiles = Number(pr.changed_files ?? files.length ?? 0);
  const additions = Number(pr.additions ?? sum(files, "additions"));

  const changedTests = fileNames.some((file) => matchesAnyPrefix(file, config.review.testPaths));
  const touchedSensitivePath = fileNames.some((file) => matchesAnyPrefix(file, config.review.sensitivePaths));

  if (!changedTests) {
    labels.add(config.labels.needsTests);
    reasons.push("No test file changes were detected.");
  }

  if (touchedSensitivePath) {
    labels.add(config.labels.needsMaintainerReview);
    reasons.push("Sensitive project or automation files changed.");
  }

  if (changedFiles > config.review.maxChangedFiles) {
    labels.add(config.labels.needsMaintainerReview);
    reasons.push(`Large PR: ${changedFiles} files changed.`);
  }

  if (additions > config.review.maxAdditions) {
    labels.add(config.labels.needsMaintainerReview);
    reasons.push(`Large PR: ${additions} additions.`);
  }

  if (!reasons.length) {
    reasons.push("PR metadata looks reviewable with no policy warnings.");
  }

  return {
    kind: "pull_request",
    labels: [...labels],
    summary: summarizeReasons("Pull request review", reasons),
    comment: buildPrComment(pr, reasons, fileNames),
    warnings: [...labels].includes(config.labels.needsMaintainerReview) ? ["Maintainer review recommended"] : []
  };
}

export function analyzeRelease(release, config) {
  if (!release) {
    throw new Error("Release payload is missing.");
  }

  const tagName = release.tag_name || release.name || "new release";
  const body = release.body || "";
  const hasNotes = normalize(body).length > 80;
  const reasons = [
    hasNotes ? "Release notes are present." : "Release notes look short and may need detail.",
    "Verify CI is green on the release commit.",
    "Confirm changelog, version, package artifacts, and security advisories."
  ];

  return {
    kind: "release",
    labels: [],
    summary: summarizeReasons(`Release checklist for ${tagName}`, reasons),
    comment: buildReleaseComment(release, reasons),
    warnings: hasNotes ? [] : ["Release notes may be incomplete"]
  };
}

function buildIssueComment(issue, reasons) {
  return [
    "## MaintainerKit triage",
    "",
    `Issue: ${issue.title || "Untitled"}`,
    "",
    ...reasons.map((reason) => `- ${reason}`),
    "",
    "A maintainer should confirm labels before taking action."
  ].join("\n");
}

function buildPrComment(pr, reasons, fileNames) {
  const files = fileNames.slice(0, 8);
  return [
    "## MaintainerKit PR review",
    "",
    `PR: ${pr.title || "Untitled"}`,
    "",
    ...reasons.map((reason) => `- ${reason}`),
    files.length ? "" : null,
    files.length ? "Changed files sampled:" : null,
    ...files.map((file) => `- \`${file}\``),
    "",
    "This is an automated maintainer assist. Final review stays with project maintainers."
  ].filter((line) => line !== null).join("\n");
}

function buildReleaseComment(release, reasons) {
  return [
    "## MaintainerKit release checklist",
    "",
    `Release: ${release.tag_name || release.name || "Untitled"}`,
    "",
    ...reasons.map((reason) => `- ${reason}`),
    "- Check package registry publishing status.",
    "- Confirm rollback notes are documented if this release is risky."
  ].join("\n");
}

function summarizeReasons(title, reasons) {
  return `${title}: ${reasons.join(" ")}`;
}

function normalize(value) {
  return String(value).toLowerCase();
}

function matchesAnyPrefix(file, prefixes) {
  return prefixes.some((prefix) => file === prefix || file.startsWith(prefix));
}

function sum(items, key) {
  return items.reduce((total, item) => total + Number(item[key] || 0), 0);
}
