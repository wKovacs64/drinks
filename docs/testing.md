# Testing

Choose the test boundary based on behavior, not implementation convenience.

## Vitest

Vitest runs in the Node environment. Use it primarily to test deep module public interfaces:

- public schemas
- service factories
- domain behavior through exported module entrypoints

Avoid route and component tests. Test an internal implementation detail only when it contains a
critical calculation or similarly important isolated algorithm that cannot be covered clearly
through the public interface.

Run Vitest with:

```sh
pnpm test
```

## Playwright

Use Playwright for user-facing behavior. Exercise the application through the browser rather than
calling loaders, actions, or components directly.

HTTP behavior that affects users or security belongs here too. For example, verify that content
visible only to an authenticated admin is never returned with public cache headers.

Run Playwright with:

```sh
pnpm test:e2e
```

## Test Location

- Deep module tests: alongside the module under `app/modules/<module>/`
- Browser tests: `playwright/tests/`
- Rare isolated algorithm tests: alongside the implementation
