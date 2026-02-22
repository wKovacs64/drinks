# drinks

_Craft Cocktail Gallery_

## Technologies Used

- [React Router](https://reactrouter.com/) (full stack web framework)
- [React](https://reactjs.org/) (UI library)
- [SQLite](https://www.sqlite.org/) + [Drizzle](https://orm.drizzle.team/) (database)
- [ImageKit](https://imagekit.io/) (image storage/CDN)
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
- React Router `./+types` imports should always be last in the import list
- Strict types
  - Avoid type assertions when possible, prefer actual type identification/runtime checks to narrow
- Prioritize correctness > readability > brevity (optimize for reading, not writing)
- Very explicit variable names

## React Compiler

- This project uses the React Compiler, so manual memoization with React.memo, useCallback, or
  useMemo should not normally be necessary.

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
