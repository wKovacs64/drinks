# Releasing

This application is released using [release-please](https://github.com/googleapis/release-please).

### Workflow:

1. Create feature branches and open PRs to `main` using
   [conventional commit](https://www.conventionalcommits.org/) messages (`feat:`, `fix:`, etc.)

2. release-please automatically creates/updates a Release PR with the changelog and version bump

3. When ready to release, merge the Release PR

4. release-please creates the GitHub release with the new tag

The [CI workflow](.github/workflows/ci.yml) requires formatting, lint, types, tests, and build before
running release-please. A successful push to `main` without a new release deploys to the Fly dev app;
a newly created release deploys to the production app and purges the Fastly cache.

Both Fly apps run with `NODE_ENV=production`; `DEPLOYMENT_ENV` distinguishes `dev` from `prod`.
The runtime executes the TypeScript application through Remix's Node adapter and applies pending
SQL migrations before listening. SQLite lives on the mounted volume, so each app requires its own
volume and database. Keep the deployment within the single-region constraint in `AGENTS.md`.
