# Deep Modules Restructure

Restructure the drinks app from "organized by technical role" to "deep modules" — substantial
implementations behind minimal public interfaces, with tests as the enforcement boundary. Goal:
make the codebase AI-agent-friendly.

## Modules

Three modules under `app/modules/`: **drinks**, **auth**, **search**.

Each module has:

- `index.ts` — public interface (types + re-exports)
- `index.test.ts` — vitest tests against public interface only
- `implementation/` — internals (queries, external service calls, validation, etc.)
- `ui/` — React components owned by that domain (where applicable)

### drinks

Owns: cocktail CRUD, images (ImageKit), cache invalidation (Fastly), validation (zod), markdown
rendering, placeholder image generation, and all drink/tag UI components (public + admin).

Public API:

- Types: `Drink`, `NewDrink`, `EnhancedDrink`, `DrinkFormFields`
- Queries: `getAllDrinks`, `getPublishedDrinks`, `getDrinkBySlug`, `getDrinksByTag`, `getAllTags`
- Mutations: `createDrink`, `updateDrink`, `deleteDrink` — each orchestrates the full side-effect
  chain (DB write + ImageKit upload/delete + Fastly purge + search cache clear)
- Validation: `drinkFormSchema`
- View helpers: `withPlaceholderImages`, `parseImageUpload`
- UI: `DrinkDetails`, `DrinkList`, `DrinkSummary`, `DrinkForm`, `ImageCrop`, `Glass`, `Tag`,
  `TagLink`, `useSortableData`
- Cache keys: `getSurrogateKeyForTag`

### auth

Owns: Google OAuth, session management, authorization middleware.

Public API:

- Types: `AuthenticatedUser`
- Session: `getSession`, `commitSession`, `destroySession`, `getRawSessionCookieValue`
- Authentication: `authenticator`
- Middleware: `userMiddleware`, `adminMiddleware`, `getUserFromContext`
- Utilities: `safeRedirectTo`, `createReturnToUrl`

### search

Owns: MiniSearch indexing and search UI.

Public API:

- Search: `searchDrinks`, `purgeSearchCache`
- UI: `SearchForm`, `NoSearchTerm`, `NoDrinksFound`, `Searching`

## Cross-module dependency

`drinks` → `search` (mutations call `purgeSearchCache` after writes). This import goes through
search's public interface.

## Shared infrastructure (stays outside modules)

- `app/db/` — schema + client (used by drinks, auth, search)
- `app/core/` — app chrome (header, footer, config, errors)
- `app/navigation/` — breadcrumbs
- `app/middleware/` — logging + security headers (non-auth middleware)
- `app/utils/env.server.ts` — cross-cutting env config
- `app/utils/request-idle-callback-shim.ts`
- `app/styles/`
- `app/types.ts` — `AppRouteHandle`, `GuardType` (route-level types only; `EnhancedDrink` moves
  into drinks module)

## Routes

Stay in `app/routes/`. Become thin orchestration layers that import from module public APIs.
Example after restructure:

```ts
import { createDrink, drinkFormSchema, parseImageUpload } from "#/app/modules/drinks"

export async function action({ request, context }: Route.ActionArgs) {
  const user = getUserFromContext(context)
  const formData = await parseImageUpload(request)
  const parsed = drinkFormSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { errors: parsed.error.flatten() }
  await createDrink(parsed.data, formData.get("image"))
  // flash + redirect
}
```

## Testing strategy

### Module tests (new)

- Runner: vitest
- DB: real SQLite test database (reuse existing `resetAndSeedDatabase()`)
- External services: msw (Mock Service Worker) intercepts ImageKit + Fastly HTTP calls
- Scope: test each module's public API functions only
- No component tests

### E2E tests (existing)

Playwright tests stay unchanged. They cover the full user-facing flow. Module tests complement
them with fast feedback on logic correctness.

| Layer | Tool | Speed |
| --- | --- | --- |
| Module API | vitest + msw + real SQLite | seconds |
| Full app | Playwright + browser | minutes |

## Migration map

| Current location | New location |
| --- | --- |
| `app/models/drink.server.ts` | `drinks/implementation/queries.server.ts` |
| `app/models/user.server.ts` | `auth/implementation/queries.server.ts` |
| `app/admin/drink-form.tsx` | `drinks/ui/drink-form.tsx` |
| `app/admin/image-crop.tsx` | `drinks/ui/image-crop.tsx` |
| `app/admin/use-sortable-data.ts` | `drinks/ui/use-sortable-data.ts` |
| `app/drinks/*.tsx` | `drinks/ui/*.tsx` |
| `app/tags/tag.tsx, tag-link.tsx` | `drinks/ui/tag.tsx, tag-link.tsx` |
| `app/tags/utils.ts` | `drinks/implementation/tags.ts` |
| `app/validation/drink.ts` | `drinks/implementation/validation.ts` |
| `app/utils/imagekit.server.ts` | `drinks/implementation/imagekit.server.ts` |
| `app/utils/fastly.server.ts` | `drinks/implementation/fastly.server.ts` |
| `app/utils/markdown.server.ts` | `drinks/implementation/markdown.server.ts` |
| `app/utils/placeholder-images.server.ts` | `drinks/implementation/placeholder-images.server.ts` |
| `app/utils/parse-image-upload.server.ts` | `drinks/implementation/parse-image-upload.server.ts` |
| `app/auth/*.ts` | `auth/implementation/*.ts` |
| `app/middleware/authorization.server.ts` | `auth/implementation/middleware.server.ts` |
| `app/search/*.server.ts` | `search/implementation/*.server.ts` |
| `app/routes/_app.search/search-form.tsx` etc. | `search/ui/*.tsx` |
| `app/types.ts` (`EnhancedDrink`) | `drinks/implementation/types.ts` |

Directories deleted after migration: `app/models/`, `app/admin/`, `app/drinks/`, `app/tags/`,
`app/validation/`, `app/auth/`, `app/search/`.

New orchestration file: `drinks/implementation/mutations.server.ts` — consolidates the
create/update/delete side-effect chains currently spread across route actions.
