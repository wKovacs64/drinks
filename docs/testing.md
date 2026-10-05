# Testing

All tests use `remix/test` and `remix/assert`. `pnpm test` runs the complete suite, and
`pnpm validate` adds formatting, lint, and type checks. Install the Chromium engine once:

```sh
pnpm exec playwright install chromium --only-shell
```

## Module tests

Test deep modules through their public schemas and service factories. Keep tests alongside the
module under `app/modules/<module>/`. Exercise private implementation through those public contracts.

```sh
pnpm test --type server
```

## End-to-end tests

Use real Chromium pages for user flows and HTTP security behavior. These tests live under
`test/e2e/` with `.test.e2e.ts` names. `createBrowserPage(testContext, { admin: true })` seeds test
records, starts the real router with native `createTestServer`, and injects a signed admin session
when requested. Native `t.serve()` owns page and server cleanup. Each case gets a fresh browser
context, and each worker uses an isolated in-memory SQLite database.

Use browser waits for the observable state before making a native assertion: for example,
`locator.waitFor()` before reading a rendered result, or `page.waitForURL()` after a submission.
The engine config in `test/browser.config.ts` sets a device scale factor of 2 for responsive-image
checks. Playwright supplies the browser engine; Remix owns test discovery, execution, and cleanup.
Wait for `document.documentElement.dataset.remixReady === "true"` before interacting with hydrated
controls, then wait for the observable result before asserting.

```sh
pnpm test --type e2e
```

## Setup and focused runs

`remix.json` owns discovery and sequential worker settings. Suites explicitly import `test/setup.ts`
(directly or through the browser helper) so their worker owns migrations and MSW's lifecycle.
`test/database.ts` owns seed records and reset behavior. Module tests inject write-effect stubs;
browser tests run the real ImageKit SDK and Fastly integration against MSW HTTP mocks in
`test/msw-handlers.ts`. MSW handles worker requests, so use browser request interception for
additional browser-originated network fixtures.

```sh
pnpm test --only "can create a new drink"
pnpm test:watch
```

The test command loads `.env.test` and prepares the same generated styles and public assets as the
application. CI installs Chromium with `--with-deps` and runs this same command. No fixed port or
persistent test database is required.
