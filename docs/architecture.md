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
const drinksService = createDrinksService({
  db: getDb(),
  writeEffects: {
    uploadImage,
    deleteImage,
    purgeDrinkCache,
  },
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
- `createDrink({ draft, imageBuffer })`
- `updateDrink({ slug, draft, imageBuffer? })`
- `deleteDrink({ slug })`

## Identity Module

`Identity` owns:

- login and callback flows
- logout
- session helpers
- auth middleware
- request user context helpers

`identity.server.ts` is the single public server seam for those concerns.

## Route Actions

Use `app/core/route-action.server.ts` to keep actions thin.

`routeAction` is responsible for:

- intent dispatch
- schema validation
- domain error translation
- redirects
- toast handling

Routes may still do pre-validation work before calling `routeAction` when needed, such as multipart
image parsing.

## Domain Errors

Expected business-rule failures should use typed domain errors. `routeAction` translates them into
field or form errors. Unexpected failures should still bubble.

Successful operations may also return warning metadata for non-fatal follow-up problems.

## Testing Boundaries

Tests should exercise public behavior through module schemas and service factories, not private
helpers.

Preferred boundary tests:

- `drinkDraftSchema`
- `createDrinksService(...)`
- `createIdentityService(...)`
- `routeAction(...)`

Use the real SQLite and Drizzle-backed test database where it is cheap. Stub expensive external
effects at the service boundary.

## Skill Flow

Preferred workflow for new work:

1. `grill-me`
2. `ubiquitous-language`
3. `write-a-prd`
4. `prd-to-issues`
5. `tdd`
6. `improve-codebase-architecture`
