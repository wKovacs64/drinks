# Architecture

## Runtime

`server.ts` adapts `app/router.ts` to Node HTTP through `remix/node-fetch-server`.
`remix/node-tsx` handles TypeScript/JSX at runtime. `app/routes.ts` defines typed Remix route patterns,
and `app/actions/controller.tsx` maps them to thin service calls and server-rendered pages. Interactive
components under `app/ui/public/` hydrate with Remix `clientEntry`; there is no React runtime.

Persistence uses `remix/data-table` with `remix/data-table/sqlite` and migrations under
`app/db/migrations/`. SQLite stores JSON arrays as text and timestamps as Unix seconds.
Request sessions and Google OpenID Connect use Remix's native session and auth APIs. The signed
cookie stores a user ID; authentication middleware resolves the current user and role from SQLite.

## Request and development boundaries

Native `cop()` checks browser request provenance using `Sec-Fetch-Site`, with an `Origin` fallback,
before routing mutations. Admin submissions use
explicit native form-data schemas, followed by the transport-independent domain draft schema.
Multipart parsing permits one 5 MiB image, at most 16 parts, 8 KiB headers per part, and a
5.25 MiB total body. The web adapter translates parser limits into existing field-error responses.
Enhanced form submissions pass the Remix event cancellation signal to fetch and discard aborted
results. Request, render, asset, and browser runtime failures use their native reporting hooks.
Request logging includes the pathname but excludes OAuth query strings.

Production leaves response compression to Fastly and Fly Proxy. Native compression is enabled in
development/test, excluding event streams. Do not enable production origin compression without
reconsidering that serving-layer policy.

The native asset server and asset CLI share `remix.json`. Production JavaScript and generated
Tailwind CSS use content fingerprints and immutable caching. Development combines native Node
and component HMR with a stable Fetch proxy and the Tailwind watcher. The browser HMR stream is
forwarded on the application origin, so LAN previews work with the existing CSP.

## Persistence

`app/db/schema.ts` defines native Remix tables, with physical SQLite column names and defaults.
Its read/write functions translate JSON text and Unix seconds into the domain's arrays and Dates,
and translate snake_case database names into camelCase application names. These are explicit
persistence boundary conversions.

SQL migrations are the source of truth for DDL. Remix does not generate schema diffs from these
table definitions. `0001_initial/up.sql` is an irreversible baseline: it creates tables/indexes
on a fresh database or adopts an existing, fully migrated catalog through `IF NOT EXISTS`.
It does not upgrade arbitrary older schemas. Remix records applied migrations in
`data_table_migrations` and verifies their checksums.

`remix.json` configures the native `remix db` CLI. `scripts/migrate.ts` uses the programmatic runner
for server startup and test setup. `server.ts` explicitly awaits migrations before listening for
requests; a migration failure prevents startup. Both runners load the same migration directory and
use the default journal.

ImageKit uploads/deletions use its official Node SDK behind the integration boundary.
`NODE_ENV=development` stores uploads locally and suppresses remote deletion and Fastly purges.
`DEPLOYMENT_ENV` identifies the hosting target; it does not select these integration behaviors.

## Responsive Images

Native Remix components in `app/ui/public/image.tsx` adapt `@unpic/core/base` output to Remix DOM
props. The shared transformer in `app/core/images.ts` imports only `unpic/providers/imagekit`;
neither integration uses React or loads the automatic provider registry. The same provider builds
blur-placeholder and social-image URLs.

Page components supply the existing layout-specific `sizes` and breakpoints. Unpic owns candidate
generation, aspect-ratio styles, loading/decoding defaults, and format-specific source attributes.
`DrinkSummary` keeps the AVIF, WebP, then original-image order in its native `<picture>` markup.
Local uploads and data URLs pass through unchanged, without fabricated format/resolution variants.
Provided breakpoint arrays are copied because Unpic sorts them in place.

## Deep Modules

Server-side business behavior lives in a small number of deep domain modules under `app/modules/`.

Each module exposes exactly two public entrypoints:

- `<module>.ts` for shared types, Draft and Editor contracts, read models (e.g. **Drink view**), and re-exported schemas
- `<module>.server.ts` for server-only factories and public server behavior

Everything else in the module directory is private implementation detail.

Modules:

- `Drinks`
- `Identity`

## Frames

The search page has one named, blocking Remix `Frame`. Its initial document response includes
server-rendered content; there is no deferred loading placeholder. The same public URL serves the
document and its fragment, selected by `X-Remix-Target`.

`app/web/search-page/route-adapter.server.tsx` owns the search document/fragment responses and cache
headers. The `search-results` Frame contains the query-dependent breadcrumbs, search form, and
results so they stay consistent through submissions and browser history. Forms target that Frame;
the gallery header, footer, and document head stay outside it. Both response variants set
`Vary: X-Remix-Target` and retain the existing Fastly surrogate keys. Initial documents retain their
responsive photo preloads. Their blocking Frame makes an internal GET, so initial search reads run
once for those preloads and again for the region; cached search and placeholder work is reused.

The admin drinks list uses ordinary form submissions and native redirects. Remix reconciles the
returned document while matching client entries retain their filter and sort state. There is no
named admin Frame or separate table-deletion response contract.

See `docs/frames-performance.md` for the baseline comparison and reproducible measurement harness.

## Public Entry Points

Consumers should import only from:

- `#/app/modules/<module>/<module>.ts`
- `#/app/modules/<module>/<module>.server.ts`

Do not import module internals from routes, tests, or other modules.

## Service Factories

Routes stay thin. They create a service per request and delegate business behavior to it.

Example shape:

```ts
const drinksService = createDrinksService({ db: getDb() });
const adminDrinksWriteService = createAdminDrinksWriteService({
  db: getDb(),
  writeEffects: { uploadImage, deleteImage, purgeDrinkCache },
});
```

Factories accept explicit boundary dependencies only.

Internal collaborators such as markdown rendering, search internals, and image placeholder
decoration stay module-private.

## Drinks Module

`Drinks` owns:

- drink create, edit, delete behavior
- Draft validation contract
- Editor read models for admin forms
- gallery read models (**Drink view**, **Drink for viewer**) for routes and UI
- publish visibility policy
- tag and search read behavior
- image lifecycle orchestration
- search invalidation and drink-cache purge orchestration

Routes should ask the module for capability-shaped reads instead of shaping raw persistence rows.

Current `Drinks` seam examples:

- `getPublishedDrinks()`
- `getAllDrinks()`
- `getDrinkBySlug({ slug, viewerRole })`
- `getDrinksByTagSlug({ tagSlug })`
- `getAllTags()`
- `searchPublishedDrinks({ query })`
- `getNewDrinkEditor()`
- `findDrinkEditorBySlug(slug)`
- `createAdminDrinksWriteService(...).create({ draft, imageBuffer })`
- `createAdminDrinksWriteService(...).update({ slug, draft, imageBuffer? })`
- `createAdminDrinksWriteService(...).delete({ slug })`

A successful SQLite write is the completion point for create, update, and delete. The module
invalidates local search immediately after persistence, then attempts image retirement when needed
and the targeted public-page cache purge. Those follow-up failures return success with
`DrinkWriteNotice` metadata (`oldImageCleanupFailed`, `cacheRefreshFailed`); multiple failures retain
all notices. The saved slug remains available after a rename even when purge fails.

Update and delete retire the previously referenced image only after persistence succeeds. If an
insert or replacement update fails, the module attempts to remove the new upload and rethrows the
original persistence error. A compensation failure is logged without replacing that error. These
remote effects do not run inside a database transaction, and notices do not schedule retries.

The Fastly integration rejects both HTTP non-2xx and network failures so the module can apply this
completion policy consistently. Development and missing Fastly configuration retain their intentional
skip behavior. Purges include the old/new slugs and tags for an update.

## Identity Module

`Identity` owns:

- verified-email admission for existing Users, with profile refresh and no User creation
- current User resolution from SQLite, including the current role and missing/deleted Users
- login and callback flows, logout, session helpers, and auth middleware as web adapters

`identity.server.ts` is the single public server seam for those concerns. Its
`createIdentityService({ db })` factory exposes `admitUser(...)` and `getSessionUser({ userId })`,
both returning a `SessionUser` or `null`. Rejected admission makes no persistence changes;
successful admission refreshes name and avatar while preserving ID, email, and role. Current User
resolution reads SQLite on each lookup so role changes and deletion apply to the next request.

The OAuth callback and session-auth middleware use the same private factory implementation.
The adapters own OAuth completion, session rotation and invalidation, redirects, Return-to URL
sanitization, and authentication-error handling; the service owns admission and User resolution.

`app/router.ts` owns the admin route gate: unauthenticated requests redirect to login and
authenticated users without the admin role redirect to `/unauthorized`.

## Route Actions and Web Adapters

Routes stay thin by constructing per-request services and delegating route-specific behavior to the
smallest deep web adapter that owns that route seam.

A route may call a module service directly when the route has no meaningful translation logic. When a
route must coordinate submission parsing, schema validation, typed module outcomes, Remix v3
responses, redirects, and toasts, put that behavior behind a web adapter instead of rebuilding it in
the route.

The **Admin Drink Write Route Adapter** is the accepted deep web adapter for the **Admin Drink Write
Path**. It owns multipart submission preparation, `drinkDraftSchema` validation, and the complete
translation from typed Drinks module write outcomes into field/form error data, not-found responses,
redirects, and toasts. Routes and generic helpers must not partially translate those outcomes.

Both new and edit pages consume the Drinks module's prepared `DrinkEditor`. The form uses its
explicit mode for create/edit behavior, including automatic slugs only in create mode until a manual
slug edit.

The enhanced editor keeps its text, selected image, and crop in the mounted form while submitting
the asynchronously prepared JPEG. `app/web/admin-drink-write/editor-response.ts` defines its
validated response contract: complete field/form errors, a missing target, or a navigation destination.
Validation and missing-target responses retain their `400` and `404` statuses. The adapter translates
Drink write outcomes; the browser presents those translated outcomes without reconstructing domain
policy.

The editor sends `Accept: application/vnd.drinks.editor+json` on create/edit POST requests.
`adminDrinkEditorRedirects` wraps the admin gate and write adapter to turn their actual redirects into
navigation data for just those enhanced requests. Manual fetch redirects hide `Location` from browser
code, and following them could fetch external OAuth as HTML. Navigation data therefore uses `200`;
the editor performs document navigation to `/login` so native OAuth redirects and session handling
run normally. Unmarked requests and other routes keep native redirects. This targeted JSON flow
preserves crop state across validation and transport failures without relying on HTML reconciliation.

## Expected Failures and Notices

Expected business-rule failures should cross Deep Module seams as typed outcomes or typed errors that
remain transport-agnostic. Web adapters translate those expected failures into route/framework
responses. Unexpected failures before persistence should still bubble.

Successful operations may also return warning metadata for non-fatal follow-up problems. The web
adapter for the route seam owns how those warnings become toasts or response metadata. The Admin
Drink Write Route Adapter translates every write notice for all three commands, combining notices
into a warning that states the completed operation without exposing integration error details.

## Testing Boundaries

Tests should exercise public behavior through module schemas and service factories, not private
helpers.

Preferred boundary tests:

- `drinkDraftSchema`
- `createDrinksService(...)`
- `createAdminDrinksWriteService(...)`
- `createIdentityService(...)`

Use the real SQLite and Remix data-table-backed test database where it is cheap. Stub expensive external
effects at the service boundary.

Browser tests exercise the web adapters through the real router. See `docs/testing.md` for runner,
database isolation, and external integration mock setup.

## Development Workflow

Use `docs/development-workflow.md` for task sequencing and optional skill guidance.
