# drinks

_Craft Cocktail Gallery_

## Technologies Used

- [Remix v3](https://remix.run/) (full stack framework, native components, ORM, schema validation, auth, and sessions)
- [SQLite](https://www.sqlite.org/) (Node native driver)
- [ImageKit](https://imagekit.io/) (image storage/CDN)
- [Unpic](https://unpic.pics/) (framework-independent responsive images)
- [MiniSearch](https://github.com/lucaong/minisearch) (search)
- [Fly](https://fly.io/) (hosting)
- [Tailwind CSS](https://tailwindcss.com/) (styles)
- [GitHub Actions](https://docs.github.com/en/actions) (CI/CD)

## Current Scope/Reach

- Single admin
- Handful of users (friends and family)
- Low content item count (under 50 currently, doubt it will ever reach 100)
- SQLite is a single-file database stored on a Fly volume, so the app is constrained to a single
  region. Do not scale to multiple regions without first adding a replication strategy.

## Code Style

- Native subpath imports (`#` maps to project root)
- Explicit `.ts`/`.tsx` extensions in native subpath and relative imports
- Strict types
  - Avoid type assertions when possible, prefer actual type identification/runtime checks to narrow
- Prioritize correctness > readability > brevity (optimize for reading, not writing)
- Very explicit variable names

## Architecture

- Read `docs/architecture.md` before changing module boundaries, route actions, or auth seams
- Server-side business behavior should converge on deep modules under `app/modules/<module>/`
- Import only from a module's public entrypoints: `<module>.ts` or `<module>.server.ts`
- Routes should stay thin: create service, call service, return framework response
- Web adapters own submission validation, typed outcome translation, redirects, and session flash toasts
- Module tests should target public schemas and service factories, not private helpers

## Development Workflow

Before starting feature work, bug fixes, or refactors, consult `docs/development-workflow.md` for
skill guidance. The workflow scales by task size — not every task needs every skill, but every task
should start from the right step.

## Remix Components

- Render with `remix/component` Handles and hydrate interactive boundaries with `clientEntry`.
- Use `mix={on(...)}` and `mix={ref(...)}` for DOM interactions.
- Keep server-only imports outside hydrated component dependency graphs.

## Git Commits

- This project uses [release-please](https://github.com/googleapis/release-please) to generate
  changelogs and GitHub releases from conventional commits.
- **Never repeat a conventional commit prefix (`feat:`, `fix:`, etc.) in the commit body.** The
  commit body should be plain prose explaining the change, not another conventional commit message.
  release-please parses the body too, so a prefixed line in the body creates a duplicate changelog
  entry.

## Validation Commands

- `pnpm lint`
- `pnpm typecheck`
- `pnpm format`

## Agent skills

### Issue tracker

Issues are tracked in GitHub Issues. See `docs/agents/issue-tracker.md`.

### Triage labels

Triage uses the five default canonical labels. See `docs/agents/triage-labels.md`.

### Domain docs

Domain documentation uses a single-context layout: `GLOSSARY.md` and `docs/adr/` at the repo root.
See `docs/agents/domain.md`.
