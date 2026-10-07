# Test Harness

Install the test browser once:

```sh
pnpm exec playwright install chromium --only-shell
```

Import `test/setup.ts` in new suites, directly or through the browser helper, so migrations and MSW's
lifecycle run in the test worker. MSW intercepts worker requests; use browser request interception for
browser-originated network fixtures.

Wait for `document.documentElement.dataset.remixReady === "true"` before using hydrated controls.
