# drinks

_Craft Cocktail Gallery_

## Scope

A personal gallery for one admin and a handful of friends and family, with fewer than 100 drinks.
SQLite lives on a Fly volume; keep deployments in one region until a replication strategy exists.

## Code Style

- Use native subpath imports and explicit `.ts`/`.tsx` extensions in subpath and relative imports.
- Prefer runtime narrowing to type assertions.
- Prioritize correctness > readability > brevity, with explicit variable names.

## Context

- Before feature work, bug fixes, or refactors, read [the development workflow](docs/development-workflow.md).
- Before changing module boundaries, route actions, or auth seams, read [architecture](docs/architecture.md)
  for ownership conventions.
- When adding or changing tests, read [testing conventions](docs/testing.md).
- When releasing or changing deployment behavior, read [the release workflow](RELEASING.md).

## Agent skills

### Issue tracker

For issues, specs, or wayfinding, use GitHub Issues via [issue tracker conventions](docs/agents/issue-tracker.md).

### Triage labels

For triage roles, use the default canonical labels in [the label mapping](docs/agents/triage-labels.md).

### Domain docs

Before codebase exploration, read [domain doc rules](docs/agents/domain.md): single-context glossary and ADRs.

## Commits

Use conventional commits. Keep the body plain prose: repeating a conventional commit prefix in the
body makes release-please create a duplicate changelog entry.
