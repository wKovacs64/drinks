# Architecture

## Deep Modules

Server-side business behavior lives in a small number of deep domain modules under `app/modules/`.

Each module exposes exactly two public entrypoints:

- `<module>.ts` for shared types, Draft and Editor contracts, read models (e.g. **Drink view**), and re-exported schemas
- `<module>.server.ts` for server-only factories and public server behavior

Everything else in the module directory is private implementation detail.

Current target modules:

- `Drinks`
- `Identity`

## Public Entry Points

Consumers should import only from:

- `#/app/modules/<module>/<module>`
- `#/app/modules/<module>/<module>.server`

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
- `getDrinksByTag(tag)`
- `getAllTags()`
- `searchPublishedDrinks({ query })`
- `getNewDrinkEditor()`
- `getDrinkEditorBySlug(slug)`
- `createAdminDrinksWriteService(...).create({ draft, imageBuffer })`
- `createAdminDrinksWriteService(...).update({ slug, draft, imageBuffer? })`
- `createAdminDrinksWriteService(...).delete({ slug })`

## Identity Module

`Identity` owns:

- login and callback flows
- logout
- session helpers
- auth middleware
- request user context helpers

`identity.server.ts` is the single public server seam for those concerns.

## Route Actions and Web Adapters

Routes stay thin by constructing per-request services and delegating route-specific behavior to the
smallest deep web adapter that owns that route seam.

A route may call a module service directly when the route has no meaningful translation logic. When a
route must coordinate submission parsing, schema validation, typed module outcomes, React Router
responses, redirects, and toasts, put that behavior behind a web adapter instead of rebuilding it in
the route.

The **Admin Drink Write Route Adapter** is the accepted deep web adapter for the **Admin Drink Write
Path**. It owns multipart submission preparation, `drinkDraftSchema` validation, and the complete
translation from typed Drinks module write outcomes into field/form error data, not-found responses,
redirects, and toasts. Routes and generic helpers must not partially translate those outcomes.

## Expected Failures and Notices

Expected business-rule failures should cross Deep Module seams as typed outcomes or typed errors that
remain transport-agnostic. Web adapters translate those expected failures into route/framework
responses. Unexpected failures should still bubble.

Successful operations may also return warning metadata for non-fatal follow-up problems. The web
adapter for the route seam owns how those warnings become toasts or response metadata.

## Testing Boundaries

Tests should exercise public behavior through module schemas and service factories, not private
helpers.

Preferred boundary tests:

- `drinkDraftSchema`
- `createDrinksService(...)`
- `createAdminDrinksWriteService(...)`
- `createIdentityService(...)`
- `createAdminDrinkActionAdapter(...)`
- `updateAdminDrinkActionAdapter(...)`
- `deleteAdminDrinkActionAdapter(...)`

Use the real SQLite and Drizzle-backed test database where it is cheap. Stub expensive external
effects at the service boundary.

## Development Workflow

Use `docs/development-workflow.md` as the source of truth for skill sequencing.

Architecture-affecting work should usually start with `domain-model` so module boundaries,
capability names, and durable decisions are clarified before implementation. Use
`improve-codebase-architecture` only as an occasional architecture review tool after larger changes.
