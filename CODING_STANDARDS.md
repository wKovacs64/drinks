# Coding Standards

Review-time preferences for code and tests. [Architecture](docs/architecture.md) describes current
ownership and runtime contracts; [domain docs](docs/agents/domain.md) define vocabulary and accepted
decisions. Formatting, lint, and type rules are enforced by the tools configured in this repository.

## Code style

- Use native subpath imports.
- Prefer runtime narrowing to type assertions.
- Prioritize correctness > readability > brevity, with explicit variable names.

## Module design

When adding or moving files, follow [Remix's project tour](https://guides.remix.run/start-here/#project-tour-where-code-lives)
for framework organization.

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

Prefer Tailwind utilities for presentation and Remix's `css` mixin for styles utilities cannot express.
Reserve global CSS for fonts, theme tokens, and shared base/utility rules.

## Testing

Test modules through public schemas and service factories, exercising private helpers through those
contracts. Use real SQLite where it is cheap and stub expensive external effects at the service boundary.
Exercise web adapters through the real router in browser tests.

Before asserting, wait for the observable result with a locator or URL wait.
