# Releasing

1. Create feature branches and open PRs to `main` using
   [conventional commit](https://www.conventionalcommits.org/) messages (`feat:`, `fix:`, etc.).
   Preserve this format in commits merged into `main` so release-please can classify changes.
2. release-please opens or updates the release PR with the changelog and version bump.
3. Merge the release PR when ready to release.

A successful push to `main` without a new release deploys to the Fly dev app; a new release deploys
to production and purges the Fastly cache.

Both Fly apps run with `NODE_ENV=production`. `DEPLOYMENT_ENV=dev` identifies the hosting target;
it does not enable the local-development safeguards for ImageKit or Fastly. Each app needs its own
SQLite volume and database.
