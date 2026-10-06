# Contributing

Fork the repository and send a pull request. See [README.md](README.md) for setup and validation,
and [AGENTS.md](AGENTS.md) for project context and skill configuration.

## Implementation and review

1. Implement the issue or spec using the skill appropriate to the work. Current ownership and runtime
   contracts are in [architecture](docs/architecture.md); test setup is in [the test harness docs](docs/testing.md).
2. Review the change against [coding standards](CODING_STANDARDS.md) and the originating issue or spec.
   The `code-review` skill reports these as separate Standards and Spec reviews.
3. Resolve the findings, then run the checks appropriate to the change using the scripts in
   `package.json`. Documentation-only changes need formatting and verification of references and claims.
   The change is ready when review findings are resolved and the relevant checks pass.

Update architecture when current ownership or runtime contracts change. Commit and release mechanics
are in [RELEASING.md](RELEASING.md).
