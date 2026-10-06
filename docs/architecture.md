# Architecture

When adding or moving files, follow [Remix's project tour](https://guides.remix.run/start-here/#project-tour-where-code-lives)
for framework organization and the ownership rules below for domain modules and web adapters.

## Ownership

Keep server business behavior in deep modules under `app/modules/<module>/`. Consumers, including
tests and other modules, import only the public `<module>.ts` or `<module>.server.ts` entrypoints.
The shared entrypoint exposes types, read models, and schemas; the server entrypoint exposes factories
and server behavior. Other files are private.

Create services per request with explicit boundary dependencies. Keep internal collaborators, such
as search, markdown rendering, and image decoration, behind the module seam. Ask for capability-shaped
read models rather than reshaping persistence rows in routes.

Routes construct services, delegate, and return framework responses. Call a service directly for
simple reads; put submission validation and outcome-to-response translation behind a web adapter
when the route needs them. Expected business failures cross the module seam as transport-independent
typed outcomes or errors; unexpected failures bubble to the request boundary.

The admin write adapter owns the complete web translation, including field errors, redirects, and
toasts. See [ADR-0002](adr/0002-admin-drink-write-route-adapter-owns-web-translation.md) before changing
that seam or introducing a generic action pipeline.

## Browser and presentation

Colocate browser source under `public/` beside its narrowest owner; shared browser utilities belong
under `app/core/public/`. Keep server-only runtime imports out of hydrated dependency graphs.
Maintain static asset sources under `app/assets/`; root `public/` is generated output and local uploads.

Prefer Tailwind utilities for presentation and Remix's `css` mixin for styles utilities cannot express.
Reserve global CSS for fonts, theme tokens, and shared base/utility rules.

## Write completion

A committed Drink write counts as success even if old-image cleanup or a public-cache refresh fails.
Report these follow-up failures as warnings so an admin is not invited to repeat an already-completed
write. Remote effects stay outside database transactions; before persistence succeeds, a failure
must preserve the original error even if compensating cleanup also fails.
