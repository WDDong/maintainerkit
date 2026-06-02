# MaintainerKit

MaintainerKit is a GitHub Action and CLI for open source maintainers. It automates the repetitive parts of issue triage, pull request review, and release preparation while keeping final decisions in the maintainer's hands.

## What it does

- Labels new issues as `bug`, `feature`, `question`, `security`, or `needs-repro`.
- Posts a concise triage note with missing information and next steps.
- Reviews pull request metadata for tests, risky files, large diffs, and documentation impact.
- Generates release checklists for tag and release workflows.
- Runs in `dry-run` mode by default-friendly CLI workflows before enabling writes.
- Optionally uses OpenAI for a maintainer-facing summary when an API key is provided.

## Quick start

Add `.github/workflows/maintainerkit.yml`:

```yaml
name: MaintainerKit

on:
  issues:
    types: [opened, edited]
  pull_request_target:
    types: [opened, synchronize, reopened]
  release:
    types: [created, edited]

permissions:
  contents: read
  issues: write
  pull-requests: write

jobs:
  maintainerkit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: WDDong/maintainerkit@v0.1.0
        with:
          dry-run: "false"
          openai-api-key: ${{ secrets.OPENAI_API_KEY }}
```

Add `maintainerkit.yml`:

```yaml
project:
  name: MaintainerKit
  defaultBranch: main

labels:
  bug: bug
  feature: enhancement
  question: question
  security: security
  needsRepro: needs-repro
  needsTests: needs-tests
  needsMaintainerReview: needs-maintainer-review

review:
  maxChangedFiles: 30
  maxAdditions: 1000
  sensitivePaths:
    - package.json
    - action.yml
    - src/github.js
    - .github/workflows/
  testPaths:
    - test/
    - tests/
    - __tests__/
```

## CLI usage

Run MaintainerKit locally against a GitHub event payload:

```bash
npm exec maintainerkit -- --event ./examples/issue-event.json --config ./examples/maintainerkit.yml --dry-run
```

Or run directly from the repository:

```bash
node ./bin/maintainerkit.js --event ./examples/pr-event.json --config ./examples/maintainerkit.yml --dry-run
```

## OpenAI summary

MaintainerKit works without OpenAI. If `OPENAI_API_KEY` or the `openai-api-key` action input is present, it adds a short maintainer summary using the Responses API. The default model is configurable with `OPENAI_MODEL` and defaults to `gpt-4.1-mini`.

## Maintainer workflow

MaintainerKit is designed to reduce review load, not replace maintainers. Its output is intentionally conservative:

- Labels are suggestions based on title, body, changed files, and release metadata.
- Comments explain why a label or review hint was produced.
- Security-related issue content is flagged for maintainer attention.
- PRs touching sensitive paths get a maintainer review label.

## Roadmap

- GitHub App mode with installation-level settings.
- Dependency risk checks for lockfile changes.
- Release note drafting from merged PRs.
- Contributor onboarding replies for first-time contributors.
- Project health reports for maintainers.

## License

MIT
