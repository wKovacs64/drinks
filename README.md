<div align="center">
  <h1>Drinks 🥃</h1>
  <p>
    <em>Craft Cocktail Gallery</em>
  </p>
</div>
<hr>

## Technologies used

- [Remix](https://remix.run/) (routing, native components, assets, schema validation, sessions, Google authentication, ORM, and migrations)
- [SQLite](https://www.sqlite.org/) (Node native SQLite driver)
- [ImageKit](https://imagekit.io/) (image storage/CDN, official Node SDK for uploads and deletion)
- [Unpic](https://unpic.pics/) (responsive images through its framework-independent core and ImageKit provider)
- [MiniSearch](https://github.com/lucaong/minisearch) (search)
- [Fly](https://fly.io/) (hosting)
- [Tailwind CSS](https://tailwindcss.com/) (styles)
- [GitHub Actions](https://docs.github.com/en/actions) (CI/CD)

## Run your own

1. Clone this repo and install dependencies with `pnpm install`. The required Node version is in
   `package.json`.
2. Create an [ImageKit](https://imagekit.io/) account and get your public key, private key, and URL
   endpoint. These credentials are required even in local development.
3. Create a project in the [Google Cloud Console](https://console.cloud.google.com/), configure the
   OAuth consent screen, and create OAuth 2.0 credentials.
4. Copy `.env.example` to `.env` and populate it. Set `GOOGLE_REDIRECT_URI` and the Google OAuth
   client's authorized redirect URI to `http://localhost:5173/auth/google/callback`.
5. Start the dev server with `pnpm dev` and open http://localhost:5173.

Google sign-in requires a verified email matching an existing user; it never creates accounts.
After the first startup creates the database, run this SQL against the file configured by
`DATABASE_URL`, replacing the email with your Google account's email:

```sql
INSERT INTO users (id, email, role) VALUES ('admin', 'you@example.com', 'admin');
```

Use `pnpm dev` for local development: it stores new images locally and suppresses remote image
deletion and CDN purges. `pnpm start` uses production integrations; run `pnpm build` first.

## Development

Run `pnpm validate` before submitting changes. See [the contributor workflow](CONTRIBUTING.md) for
implementation and review, [the test harness docs](docs/testing.md) for browser setup, and
[the release workflow](RELEASING.md) for releases and deployment.
See [SVG icon instructions](app/assets/svg-icons/README.md) for adding and using icons.
See [the public MCP integration](docs/mcp.md) for tools and personal ChatGPT dev validation.

## Database migrations

Add a new numbered SQL migration under `app/db/migrations/` and update `app/db/schema.ts` together;
table definitions do not generate migrations. Keep applied migrations unchanged because their
checksums are verified.

`0001_initial` creates a fresh database or adopts a fully migrated catalog; it does not upgrade
arbitrary older schemas. It intentionally has no rollback: undoing adoption must not drop an existing
catalog.
