# Changelog

## 0.2.0

- Fetch pull request changed files from the GitHub API when event payloads do not include file details.
- Automatically create configured labels before applying them.
- Update an existing MaintainerKit comment instead of posting duplicate comments.
- Added `actions.labels`, `actions.comments`, and `actions.createLabels` configuration switches.
- Added README workflow examples and sample output.

## 0.1.0

- Added GitHub Action entry point for issue, pull request, and release events.
- Added CLI dry-run mode for local event payload testing.
- Added configurable labels, sensitive paths, test paths, and PR size thresholds.
- Added optional OpenAI maintainer summaries.
- Added Node.js test coverage for core analyzers and config parsing.
