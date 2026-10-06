# Architecture

Current code ownership and runtime contracts.

## Runtime imports

Node runs TypeScript source directly, with Remix's loader handling TSX. Subpath and relative imports
resolve source files, so their specifiers include explicit `.ts` or `.tsx` extensions. The native
subpath mapping is defined in `package.json`.

## Ownership

Server business behavior lives under `app/modules/<module>/`. The public entrypoints are
`<module>.ts` and `<module>.server.ts`; other files are private. The shared entrypoint exposes types,
read models, and schemas; the server entrypoint exposes factories and server behavior.

Routes construct services and return framework responses. The Drinks module owns Drink write
behavior, image lifecycle orchestration, cache purge orchestration, and transport-independent typed
write outcomes. The admin write adapter owns the complete web translation, including submission
validation, field errors, redirects, and toasts. [ADR-0001](adr/0001-admin-drink-write-route-adapters.md)
and [ADR-0002](adr/0002-admin-drink-write-route-adapter-owns-web-translation.md) record this seam.

## Browser and assets

Browser source lives in owner-local `public/` directories, with shared browser utilities under
`app/core/public/`. Hydrated dependency graphs run in the browser and cannot import server-only
runtime code. Static asset sources live under `app/assets/`; root `public/` is generated output and
local uploads.

## Write completion

A committed Drink write counts as success even if old-image cleanup or a public-cache refresh fails.
Report these follow-up failures as warnings so an admin is not invited to repeat an already-completed
write. Remote effects stay outside database transactions; before persistence succeeds, a failure
must preserve the original error even if compensating cleanup also fails.
