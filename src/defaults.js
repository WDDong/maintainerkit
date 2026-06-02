export const defaultConfig = {
  project: {
    name: "Open Source Project",
    defaultBranch: "main"
  },
  labels: {
    bug: "bug",
    feature: "enhancement",
    question: "question",
    security: "security",
    needsRepro: "needs-repro",
    needsTests: "needs-tests",
    needsMaintainerReview: "needs-maintainer-review"
  },
  review: {
    maxChangedFiles: 30,
    maxAdditions: 1000,
    sensitivePaths: [
      "package.json",
      "package-lock.json",
      "pnpm-lock.yaml",
      "yarn.lock",
      ".github/workflows/"
    ],
    testPaths: ["test/", "tests/", "__tests__/", "spec/"]
  },
  openai: {
    model: "gpt-4.1-mini"
  }
};

export function mergeConfig(base, override) {
  const merged = { ...base, ...override };
  merged.project = { ...base.project, ...override.project };
  merged.labels = { ...base.labels, ...override.labels };
  merged.review = { ...base.review, ...override.review };
  merged.openai = { ...base.openai, ...override.openai };
  return merged;
}
