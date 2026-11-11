# Coding Standards

Review-time preferences for code and tests. [Architecture](docs/architecture.md) describes current
ownership and runtime contracts; [domain docs](docs/agents/domain.md) define vocabulary and accepted
decisions. Formatting, lint, and type rules are enforced by the tools configured in this repository.

## Non-negotiables

Security, then performance, outrank every other standard here, including simplicity and idiomatic
Remix. A change that regresses either is rejected on that alone; when the two conflict, security wins.

- **Security:** admin access stays deny-by-default at the router; admin, auth, and session-bearing
  responses never become publicly cacheable; uploads stay bounded; server source stays out of the
  browser asset graph; session cookies stay signed, `httpOnly`, `SameSite=Lax`, and `Secure` in
  production; document responses keep their security headers.
- **Performance:** public pages hold their Core Web Vitals (LCP, INP, CLS) and TTFB. They stay
  cacheable at Fastly with their current lifetimes and keys, the LCP image keeps its high-priority
  preload, and client-module preloads wait until after paint.

Prove it in the PR: cite the test that covers each affected property (`caching`, `auth`,
`request-boundaries`, `module-loading`, `image-behavior`, and `security-headers` under
`test/e2e/`; the `🚦 Lighthouse` CI job, with budgets in [performance](docs/performance.md), for
public-page layout shift and script bytes), or attach a before-and-after measurement when no test
covers it. CI only warns on LCP, TBT, and TTFB, so a change that could move them attaches
before-and-after `pnpm perf` timings.

## Code style

- Use native subpath imports.
- Prefer runtime narrowing to type assertions.
- Prioritize correctness > readability > brevity, with explicit variable names.

## Module design

When adding or moving files, follow Remix's project tour
(`node_modules/remix/guides/01-start-here.md`)
for framework organization.

When module depth and idiomatic Remix pull in different directions, choose depth: keep a small
interface and the logic behind it in one place, even where a Remix guide places it in the route.

Keep server business behavior in deep modules. Create services per request with explicit boundary
dependencies. Keep internal collaborators, such as search, markdown rendering, and image decoration,
behind the module seam. Ask for capability-shaped read models rather than reshaping persistence rows
in routes.

For new route behavior, call a service directly for simple reads. Put submission validation and
outcome-to-response translation behind a web adapter when the route needs them. Expected business
failures cross the module seam as transport-independent typed outcomes or errors; unexpected
failures bubble to the request boundary.

## Browser and presentation

Colocate browser source under `public/` beside its narrowest owner; shared browser utilities belong
under `app/core/public/`.

Model interaction state with more than two states as a discriminated union on `status`, not
parallel booleans. When transitions depend on event order or time, put them in a pure
`transition(state, event)` module beside the component and unit-test it, as `toast-timer.ts` and
`drink-form-submission.ts` do. Expose state that tests or agents must observe through ARIA
(`aria-sort`, `aria-busy`) or `data-state`.

Prefer Tailwind utilities for presentation and Remix's `css` mixin for styles utilities cannot express.
Reserve global CSS for fonts, theme tokens, and shared base/utility rules.

## Testing

Test modules through public schemas and service factories, exercising private helpers through those
contracts. Use real SQLite where it is cheap and stub expensive external effects at the service boundary.
Exercise web adapters through the real router in browser tests.

Before asserting, wait for the observable result with a locator or URL wait.
