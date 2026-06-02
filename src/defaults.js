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
  labelDefinitions: {
    bug: {
      color: "d73a4a",
      description: "Something is not working"
    },
    enhancement: {
      color: "a2eeef",
      description: "New feature or request"
    },
    question: {
      color: "d876e3",
      description: "Further information is requested"
    },
    security: {
      color: "b60205",
      description: "Security-sensitive report"
    },
    "needs-repro": {
      color: "fbca04",
      description: "Needs reproduction details"
    },
    "needs-tests": {
      color: "fef2c0",
      description: "Needs test coverage"
    },
    "needs-maintainer-review": {
      color: "5319e7",
      description: "Needs maintainer attention"
    }
  },
  actions: {
    labels: true,
    comments: true,
    createLabels: true
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
  merged.labelDefinitions = { ...base.labelDefinitions, ...override.labelDefinitions };
  merged.actions = { ...base.actions, ...override.actions };
  merged.review = { ...base.review, ...override.review };
  merged.openai = { ...base.openai, ...override.openai };
  return merged;
}
