# Releasing

This package is released using [release-please](https://github.com/googleapis/release-please).

### Workflow:

1. Create feature branches and open PRs to `main` using
   [conventional commit](https://www.conventionalcommits.org/) messages (`feat:`, `fix:`, etc.)

2. release-please automatically creates/updates a Release PR with the changelog and version bump

3. When ready to release, merge the Release PR

4. release-please creates the GitHub release with the new tag
