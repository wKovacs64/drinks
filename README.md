<div align="center">
  <h1>Drinks 🥃</h1>
  <p>
    <em>Craft Cocktail Gallery</em>
  </p>
</div>
<hr>

## Technologies used:

- [React Router](https://reactrouter.com/) (full stack web framework)
- [React](https://reactjs.org/) (UI library)
- [SQLite](https://www.sqlite.org/) + [Drizzle](https://orm.drizzle.team/) (database)
- [ImageKit](https://imagekit.io/) (image storage/CDN)
- [MiniSearch](https://github.com/lucaong/minisearch) (search)
- [Fly](https://fly.io/) (hosting)
- [Tailwind CSS](https://tailwindcss.com/) (styles)
- [GitHub Actions](https://docs.github.com/en/actions) (CI/CD)

## Run your own:

1. Clone this repo and install dependencies with `pnpm install`
1. Create an [ImageKit](https://imagekit.io/) account and get your public key, private key, and URL
   endpoint
1. Create a project in the [Google Cloud Console](https://console.cloud.google.com/), configure the
   OAuth consent screen, and create OAuth 2.0 credentials to get your client ID and client secret
1. Copy `.env.example` to `.env` and fill in your ImageKit credentials, Google OAuth credentials,
   and other required values
1. Run database migrations with `pnpm db:migrate`
1. Start the dev server with `pnpm dev`
1. Deploy to [Fly](https://fly.io/) - see
   [Fly docs for Node apps](https://fly.io/docs/getting-started/node/)
