# Contributing

Thanks for helping improve MaintainerKit. This project is intended for practical open source maintenance workflows, so contributions should keep the tool predictable, auditable, and easy to adopt.

## Development

Requirements:

- Node.js 20 or newer
- npm

Run checks:

```bash
npm test
npm run lint
```

Try the CLI locally:

```bash
node ./bin/maintainerkit.js --event ./examples/issue-event.json --config ./examples/maintainerkit.yml --dry-run
```

## Pull requests

Good pull requests usually include:

- A small, focused change.
- Tests for new analyzer behavior.
- README or example updates when workflow behavior changes.
- Clear reasoning when a rule could label or comment on user projects.

MaintainerKit should avoid surprising maintainers. Prefer conservative warnings over aggressive automation.

## Rule design

Analyzer rules should:

- Explain why a label or warning was suggested.
- Avoid making claims that require repository context MaintainerKit does not have.
- Be configurable when different projects may reasonably choose different behavior.
- Keep security-sensitive output short and maintainer-facing.
