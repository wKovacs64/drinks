# Releasing

1. Merge changes into `main` using conventional commits.
2. release-please opens or updates the release PR with the changelog and version bump.
3. Merge the release PR when ready to release.

A successful push to `main` without a new release deploys to the Fly dev app; a new release deploys
to production and purges the Fastly cache.

Both Fly apps run with `NODE_ENV=production`. `DEPLOYMENT_ENV=dev` identifies the hosting target;
it does not enable the local-development safeguards for ImageKit or Fastly. Each app needs its own
SQLite volume and database.
