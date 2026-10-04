<div align="center">
  <h1>Drinks 🥃</h1>
  <p>
    <em>Craft Cocktail Gallery</em>
  </p>
</div>
<hr>

## Technologies used:

- [Remix v3](https://remix.run/) (routing, native components, assets, schema validation, sessions, Google authentication, ORM, and migrations)
- [SQLite](https://www.sqlite.org/) (Node native SQLite driver)
- [ImageKit](https://imagekit.io/) (image storage/CDN, official Node SDK for uploads and deletion)
- [Unpic](https://unpic.pics/) (responsive images through its framework-independent core and ImageKit provider)
- [MiniSearch](https://github.com/lucaong/minisearch) (search)
- [Fly](https://fly.io/) (hosting)
- [Tailwind CSS](https://tailwindcss.com/) (styles)
- [GitHub Actions](https://docs.github.com/en/actions) (CI/CD)

## Run your own:

1. Use Node 24.19 or newer, clone this repo, and install dependencies with `pnpm install`
1. Create an [ImageKit](https://imagekit.io/) account and get your public key, private key, and URL
   endpoint
1. Create a project in the [Google Cloud Console](https://console.cloud.google.com/), configure the
   OAuth consent screen, and create OAuth 2.0 credentials to get your client ID and client secret
1. Copy `.env.example` to `.env` and fill in your ImageKit credentials, Google OAuth credentials,
   session secret, and site image URL/alt text. Required values are validated in
   `app/core/env.server.ts`, including ImageKit credentials in local development.
1. Start the dev server with `pnpm dev`

Open http://localhost:5173. Native server/component HMR preserves compatible component state,
and a Tailwind watcher updates styles. The development supervisor uses an internal port of
`PORT + 1000` (override with `REMIX_INTERNAL_PORT`). The application explicitly applies pending
migrations in `server.ts` before listening for requests. Set `GOOGLE_REDIRECT_URI` and the Google
OAuth client's authorized redirect URI to `http://localhost:5173/auth/google/callback`.
Google sign-in requires a verified email matching an existing user and never creates accounts.
For a new database, run this SQL against the file configured by `DATABASE_URL`, replacing the email
with your Google account's email:

```sql
INSERT INTO users (id, email, role) VALUES ('admin', 'you@example.com', 'admin');
```

Development uses your local SQLite file and stores new images under `public/uploads/`. Editing or
deleting a locally copied drink does not delete its remote ImageKit image or purge the hosted CDN.
`pnpm start` uses the production ImageKit and Fastly integrations; use `pnpm dev` for local development.

## Development and testing

Run `pnpm validate` for formatting, lint, types, and the complete native Remix test suite.
`pnpm test` runs both module and Chromium end-to-end tests; each worker uses in-memory SQLite,
and native `t.serve()` starts and cleans up test servers on available ports. Install the test browser
once with `pnpm exec playwright install chromium --only-shell`. Use `pnpm test --type server` or
`pnpm test --type e2e` to focus on one suite, and `pnpm test --only "test name"` for individual cases.
Run `pnpm build` before `pnpm start` to prepare assets and check types. The server runs the TypeScript
application directly through Remix's Node adapter. Production script and stylesheet URLs are
fingerprinted by Remix, with immutable caching.
Use `pnpm assets:inspect app/ui/public/entry.ts` to inspect the browser asset policy configured in
`remix.json`. See [testing conventions](docs/testing.md) for test boundaries and setup, and
[SVG icon instructions](app/assets/svg-icons/README.md) for the `add-icon` workflow.

## Database migrations

Remix uses SQL-first migrations in `app/db/migrations/`. Each numbered directory contains an
`up.sql`; a `down.sql` is optional. `0001_initial` is a hand-authored baseline for the complete
catalog schema. It creates a fresh database or adopts a fully migrated existing database without
rewriting its drinks or users. Remix records applied migration IDs and checksums in the SQLite
`data_table_migrations` table.

Run `pnpm db:status` to inspect the journal and `pnpm db:migrate` to apply pending migrations through
the native Remix CLI. Its connection and migration directory are configured in `remix.json`.
`server.ts` and test setup explicitly invoke Remix's programmatic migration runner using the same
files. Startup fails if a migration fails.

For the next schema change, add `app/db/migrations/0002_<description>/up.sql` and update the table
definitions in `app/db/schema.ts`. Write the SQL explicitly; table definitions do not generate
migrations. Never edit an applied migration because Remix checks its checksum. The baseline has no
`down.sql`: rolling back an adoption must not drop an existing catalog.

For framework reference, see the official [Remix guides](https://guides.remix.run/) and
[data-table documentation](https://api.remix.run/api/remix/data-table/overview/).
