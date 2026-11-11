# Test Harness

Install the test browser once:

```sh
pnpm exec playwright install chromium --only-shell
```

Import `test/setup.ts` in new suites, directly or through a harness helper, so migrations and MSW's
lifecycle run in the test worker. MSW intercepts worker requests; use browser request interception for
browser-originated network fixtures.

`startSeededApp` in `test/seeded-app.ts` resets and seeds the database, clears the search index,
serves the real router over HTTP, and optionally returns an Admin session cookie. Browser tests get a
page on it from `createBrowserPage` in `test/e2e.ts`; tests that need no browser request its
`baseUrl` directly, as `test/mcp.test.ts` does, and register its `close` with `testContext.after`.

Test files run in up to four forked workers with separate in-memory SQLite databases and MSW
handlers. Each E2E file also gets its own browser. Tests within a file run sequentially so database
resets remain isolated. Use
`pnpm test --concurrency 1` when debugging a single worker.

Access logging is disabled in test mode. Tests that deliberately cause errors capture and assert
their expected `console.error` calls with `testContext.mock.method`, which restores the logger after
each test. Keep unexpected errors visible.

Wait for `document.documentElement.dataset.remixReady === "true"` before using hydrated controls.

Performance budgets have their own harness; see [performance budgets](performance.md).
