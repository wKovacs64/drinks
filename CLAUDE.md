# drinks

_Craft Cocktail Gallery_

## Technologies Uesd

- [React Router](https://reactrouter.com/) (full stack web framework)
- [React](https://reactjs.org/) (UI library)
- [Contentful](https://www.contentful.com/) (headless CMS) with [GraphQL](https://graphql.org/) (API
  interaction)
- [MiniSearch](https://github.com/lucaong/minisearch) (search)
- [Fly](https://fly.io/) (hosting)
- [Tailwind CSS](https://tailwindcss.com/) (styles)
- [GitHub Actions](https://docs.github.com/en/actions) (CI/CD)

## Current Scope/Reach

- Single admin
- Handful of users (friends and family)
- Low content item count (~50 currently, doubt it will ever reach 100)

## Code Style

- Native subpath imports (`#` maps to project root)
- React Router `./+types` imports should always be last in the import list
- Strict types
  - Avoid type assertions when possible, prefer actual type identification/runtime checks to narrow
- Prioritize correctness > readability > brevity (optimize for reading, not writing)
- Very explicit variable names

## Validation Commands

- `pnpm lint`
- `pnpm typecheck`
- `pnpm format`
