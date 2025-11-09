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
- [Contentful](https://www.contentful.com/) (headless CMS) with [GraphQL](https://graphql.org/) (API
  interaction)
- [MiniSearch](https://github.com/lucaong/minisearch) (search)
- [Fly](https://fly.io/) (hosting)
- [Tailwind CSS](https://tailwindcss.com/) (styles)
- [GitHub Actions](https://docs.github.com/en/actions) (CI/CD)

## Run your own:

1. Create a new space, content management token, and content delivery (access) token at
   [Contentful](https://www.contentful.com/).
1. Clone this repo and change to the directory.
   - You'll probably want to edit the name, description, etc.

1. Use the [`contentful-cli`](https://github.com/contentful/contentful-cli) package to run the
   following:

   ```sh
   contentful space import --management-token <your-management-token> --space-id <your-space-id> --content-file contentful-space.json
   ```

1. Copy the provided `.env.example` file to a new `.env` file and fill in the values with your
   information.

1. Deploy to [Fly](https://fly.io/):
   - See [Fly docs for Node apps](https://fly.io/docs/getting-started/node/)

1. Create a couple webhooks in Contentful (one for dev and one for prod):
   - Trigger off `Entry` `Publish` and `Unpublish` events
   - `POST` requests to `<your-domain>/_/content-change` (domain should differ for dev and prod)
   - Set custom `X-Contentful-Webhook-Token` header to a private, generated token of your choosing
     (this will need to match what's in your `CONTENTFUL_ACCESS_TOKEN` environment variable)
   - Leave the default content type (`application/vnd.contentful.management.v1+json`)
