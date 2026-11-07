# Performance Budgets

The `🚦 Lighthouse` CI job runs Lighthouse CI against the production server. It fails when a public
page exceeds its layout shift or script budget and only warns on timing budgets, which vary between
identical builds on CI runners. It runs on every branch except `main`, so lab variance cannot block a
deploy. Run it locally with:

```sh
pnpm exec playwright install chromium --no-shell
pnpm perf
```

`pnpm perf` builds the app, starts `server.ts` with `NODE_ENV=production`, `.env.test` values, and an
in-memory database seeded with the test Drinks, then audits `/`, `/test-margarita`, `/search`, and
`/search?q=citrus` three times each with Lighthouse's default mobile emulation in Playwright's
Chromium. Assertions use the median run. Reports are written to `.lighthouseci/reports`; CI uploads
them as the `lighthouse-reports` artifact.

| Metric                                  | Budget                        | Level |
| --------------------------------------- | ----------------------------- | ----- |
| Largest Contentful Paint                | 2500 ms                       | warn  |
| Total Blocking Time (lab proxy for INP) | 200 ms                        | warn  |
| Cumulative Layout Shift                 | 0.05                          | error |
| Server response time (TTFB)             | 200 ms                        | warn  |
| Script bytes, uncompressed              | 180 KiB; 220 KiB on `/search` | error |
| Performance score                       | 90                            | warn  |

The lab setup differs from production: seeded Drinks use a same-origin JPEG rather than ImageKit, so
pages render no AVIF/WebP sources, responsive candidates, or image preloads, and the server sends
uncompressed responses because production leaves compression to Fastly and Fly Proxy. Treat the
numbers as regression guards, not field predictions. Budgets live in
[`test/lighthouse/lighthouserc.cjs`](../test/lighthouse/lighthouserc.cjs).
