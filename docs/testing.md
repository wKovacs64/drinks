# Testing

Install the test browser once:

```sh
pnpm exec playwright install chromium --only-shell
```

Test modules through public schemas and service factories, exercising private helpers through those
contracts. Use real SQLite where it is cheap and stub expensive external effects at the service boundary.
Exercise web adapters through the real router in browser tests.

Import `test/setup.ts` in new suites, directly or through the browser helper, so migrations and MSW's
lifecycle run in the test worker. MSW intercepts worker requests; use browser request interception for
browser-originated network fixtures.

Wait for `document.documentElement.dataset.remixReady === "true"` before using hydrated controls.
Before asserting, wait for the observable result with a locator or URL wait.
