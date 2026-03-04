# Deep Modules Restructure — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Restructure the drinks app into three deep modules (auth, drinks, search) with barrel
exports, co-located UI, and vitest tests against public interfaces.

**Architecture:** Each module gets `index.ts` (public API), `implementation/` (internals), `ui/`
(components), and `index.test.ts` (tests). Routes become thin orchestration importing only from
module barrels. Shared infra (db, core, navigation, styles) stays put.

**Tech Stack:** Vitest, MSW, SQLite (real test DB), React Router, Drizzle, Zod

**Design doc:** `docs/plans/2026-03-03-deep-modules-design.md`

---

## Task 1: Set up vitest

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`

**Step 1: Install dependencies**

```bash
pnpm add -D vitest msw
```

**Step 2: Create vitest config**

Create `vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    envFile: ".env.test",
  },
});
```

**Step 3: Add test script to package.json**

Add to the `"scripts"` section:

```json
"test": "vitest run",
"test:watch": "vitest"
```

**Step 4: Verify vitest runs**

```bash
pnpm test
```

Expected: vitest runs, finds no test files, exits cleanly (0 tests).

**Step 5: Commit**

```
chore: set up vitest with msw
```

---

## Task 2: Create auth module

Move 6 files into `app/modules/auth/`, create barrel, update all consumers.

**Files to move:**

| Old path | New path |
| --- | --- |
| `app/auth/auth.server.ts` | `app/modules/auth/implementation/authenticator.server.ts` |
| `app/auth/session.server.ts` | `app/modules/auth/implementation/session.server.ts` |
| `app/auth/types.ts` | `app/modules/auth/implementation/types.ts` |
| `app/auth/utils.server.ts` | `app/modules/auth/implementation/utils.server.ts` |
| `app/middleware/authorization.server.ts` | `app/modules/auth/implementation/middleware.server.ts` |
| `app/models/user.server.ts` | `app/modules/auth/implementation/queries.server.ts` |

**Step 1: Create directories and move files**

```bash
mkdir -p app/modules/auth/implementation
git mv app/auth/auth.server.ts app/modules/auth/implementation/authenticator.server.ts
git mv app/auth/session.server.ts app/modules/auth/implementation/session.server.ts
git mv app/auth/types.ts app/modules/auth/implementation/types.ts
git mv app/auth/utils.server.ts app/modules/auth/implementation/utils.server.ts
git mv app/middleware/authorization.server.ts app/modules/auth/implementation/middleware.server.ts
git mv app/models/user.server.ts app/modules/auth/implementation/queries.server.ts
```

**Step 2: Update internal imports in moved files**

`app/modules/auth/implementation/authenticator.server.ts` — change one import:

```diff
-import { updateUserOnLogin } from "#/app/models/user.server";
+import { updateUserOnLogin } from "./queries.server";
```

`app/modules/auth/implementation/middleware.server.ts` — change four imports:

```diff
-import { getSession, commitSession, destroySession } from "#/app/auth/session.server";
-import { getUserById } from "#/app/models/user.server";
-import { createReturnToUrl } from "#/app/auth/utils.server";
-import type { AuthenticatedUser } from "#/app/auth/types";
+import { getSession, commitSession, destroySession } from "./session.server";
+import { getUserById } from "./queries.server";
+import { createReturnToUrl } from "./utils.server";
+import type { AuthenticatedUser } from "./types";
```

All other moved files have no internal cross-references to update (they import from `#/app/db/`
or `#/app/utils/env.server` which stay put, or from `./types` which is a sibling move).

**Step 3: Create barrel**

Create `app/modules/auth/index.ts`:

```ts
export type { AuthenticatedUser } from "./implementation/types";
export { authenticator } from "./implementation/authenticator.server";
export {
  sessionCookie,
  getSession,
  commitSession,
  destroySession,
  getRawSessionCookieValue,
} from "./implementation/session.server";
export {
  userMiddleware,
  adminMiddleware,
  getUserFromContext,
} from "./implementation/middleware.server";
export { safeRedirectTo, createReturnToUrl } from "./implementation/utils.server";
```

**Step 4: Update all route consumers**

Every route that imported from `#/app/auth/*`, `#/app/middleware/authorization*`, or
`#/app/models/user.server` now imports from `#/app/modules/auth`.

| File | Old imports | New import source |
| --- | --- | --- |
| `routes/admin.tsx` | `#/app/auth/session.server`, `#/app/middleware/authorization.server` | `#/app/modules/auth` |
| `routes/admin.drinks.new.tsx` | `#/app/auth/session.server` | `#/app/modules/auth` |
| `routes/admin.drinks.$slug.edit.tsx` | `#/app/auth/session.server` | `#/app/modules/auth` |
| `routes/admin.drinks.$slug.delete.tsx` | `#/app/auth/session.server` | `#/app/modules/auth` |
| `routes/auth.google.callback.tsx` | `#/app/auth/auth.server`, `#/app/auth/session.server`, `#/app/auth/utils.server`, `#/app/auth/types` | `#/app/modules/auth` |
| `routes/login.tsx` | `#/app/auth/auth.server`, `#/app/auth/session.server`, `#/app/auth/utils.server` | `#/app/modules/auth` |
| `routes/logout.tsx` | `#/app/auth/session.server` | `#/app/modules/auth` |

Example — `routes/admin.tsx` before:

```ts
import { getSession, commitSession } from "#/app/auth/session.server";
import {
  userMiddleware,
  adminMiddleware,
  getUserFromContext,
} from "#/app/middleware/authorization.server";
```

After:

```ts
import {
  getSession,
  commitSession,
  userMiddleware,
  adminMiddleware,
  getUserFromContext,
} from "#/app/modules/auth";
```

Apply the same pattern to all 7 route files listed above. Each file: replace the old auth imports
with a single import from `#/app/modules/auth`.

**Step 5: Delete empty old directories**

```bash
rm -r app/auth
```

`app/middleware/` still has `logging.server.ts` and `security-headers.server.ts` — keep it.
`app/models/` still has `drink.server.ts` — keep it for now (moves in Task 3).

**Step 6: Verify**

```bash
pnpm typecheck && pnpm lint && pnpm format
```

**Step 7: Commit**

```
refactor: create auth module
```

---

## Task 3: Create drinks module

Move 18 files into `app/modules/drinks/`, create `EnhancedDrink` types file, create barrel,
update all consumers.

**Files to move:**

| Old path | New path |
| --- | --- |
| `app/models/drink.server.ts` | `app/modules/drinks/implementation/queries.server.ts` |
| `app/validation/drink.ts` | `app/modules/drinks/implementation/validation.ts` |
| `app/tags/utils.ts` | `app/modules/drinks/implementation/tags.ts` |
| `app/utils/imagekit.server.ts` | `app/modules/drinks/implementation/imagekit.server.ts` |
| `app/utils/fastly.server.ts` | `app/modules/drinks/implementation/fastly.server.ts` |
| `app/utils/markdown.server.ts` | `app/modules/drinks/implementation/markdown.server.ts` |
| `app/utils/placeholder-images.server.ts` | `app/modules/drinks/implementation/placeholder-images.server.ts` |
| `app/utils/parse-image-upload.server.ts` | `app/modules/drinks/implementation/parse-image-upload.server.ts` |
| `app/drinks/drink-details.tsx` | `app/modules/drinks/ui/drink-details.tsx` |
| `app/drinks/drink-list.tsx` | `app/modules/drinks/ui/drink-list.tsx` |
| `app/drinks/drink-summary.tsx` | `app/modules/drinks/ui/drink-summary.tsx` |
| `app/drinks/glass.tsx` | `app/modules/drinks/ui/glass.tsx` |
| `app/tags/tag.tsx` | `app/modules/drinks/ui/tag.tsx` |
| `app/tags/tag-link.tsx` | `app/modules/drinks/ui/tag-link.tsx` |
| `app/admin/drink-form.tsx` | `app/modules/drinks/ui/drink-form.tsx` |
| `app/admin/image-crop.tsx` | `app/modules/drinks/ui/image-crop.tsx` |
| `app/admin/use-sortable-data.ts` | `app/modules/drinks/ui/use-sortable-data.ts` |

Plus one new file: `app/modules/drinks/implementation/types.ts`

**Step 1: Create directories and move files**

```bash
mkdir -p app/modules/drinks/implementation app/modules/drinks/ui
git mv app/models/drink.server.ts app/modules/drinks/implementation/queries.server.ts
git mv app/validation/drink.ts app/modules/drinks/implementation/validation.ts
git mv app/tags/utils.ts app/modules/drinks/implementation/tags.ts
git mv app/utils/imagekit.server.ts app/modules/drinks/implementation/imagekit.server.ts
git mv app/utils/fastly.server.ts app/modules/drinks/implementation/fastly.server.ts
git mv app/utils/markdown.server.ts app/modules/drinks/implementation/markdown.server.ts
git mv app/utils/placeholder-images.server.ts app/modules/drinks/implementation/placeholder-images.server.ts
git mv app/utils/parse-image-upload.server.ts app/modules/drinks/implementation/parse-image-upload.server.ts
git mv app/drinks/drink-details.tsx app/modules/drinks/ui/drink-details.tsx
git mv app/drinks/drink-list.tsx app/modules/drinks/ui/drink-list.tsx
git mv app/drinks/drink-summary.tsx app/modules/drinks/ui/drink-summary.tsx
git mv app/drinks/glass.tsx app/modules/drinks/ui/glass.tsx
git mv app/tags/tag.tsx app/modules/drinks/ui/tag.tsx
git mv app/tags/tag-link.tsx app/modules/drinks/ui/tag-link.tsx
git mv app/admin/drink-form.tsx app/modules/drinks/ui/drink-form.tsx
git mv app/admin/image-crop.tsx app/modules/drinks/ui/image-crop.tsx
git mv app/admin/use-sortable-data.ts app/modules/drinks/ui/use-sortable-data.ts
```

**Step 2: Create EnhancedDrink types file**

Create `app/modules/drinks/implementation/types.ts`:

```ts
export type EnhancedDrink = {
  title: string;
  slug: string;
  image: { url: string; blurDataUrl: string };
  ingredients: string[];
  calories: number;
  notes: string | null;
  tags: string[];
};
```

**Step 3: Remove EnhancedDrink from app/types.ts**

Edit `app/types.ts` — remove the `EnhancedDrink` type export. Keep `AppRouteHandle` and
`GuardType`. The file should become:

```ts
import type { BreadcrumbHandle } from "#/app/navigation/breadcrumbs";

export type AppRouteHandle = BreadcrumbHandle;

export type GuardType<TypeGuardFn> = TypeGuardFn extends (x: any, ...rest: any) => x is infer U
  ? U
  : never;
```

**Step 4: Update internal imports in moved files**

`implementation/fastly.server.ts`:

```diff
-import { getSurrogateKeyForTag } from "#/app/tags/utils";
+import { getSurrogateKeyForTag } from "./tags";
```

`implementation/placeholder-images.server.ts`:

```diff
-import type { EnhancedDrink } from "#/app/types";
+import type { EnhancedDrink } from "./types";
```

`ui/drink-details.tsx`:

```diff
-import type { EnhancedDrink } from "#/app/types";
-import { Tag } from "#/app/tags/tag";
-import { TagLink } from "#/app/tags/tag-link";
+import type { EnhancedDrink } from "../implementation/types";
+import { Tag } from "./tag";
+import { TagLink } from "./tag-link";
```

`ui/drink-list.tsx`:

```diff
-import type { EnhancedDrink } from "#/app/types";
+import type { EnhancedDrink } from "../implementation/types";
```

`ui/drink-summary.tsx`:

```diff
-import type { EnhancedDrink } from "#/app/types";
+import type { EnhancedDrink } from "../implementation/types";
```

All other moved files have imports that either stay the same (e.g., `#/app/db/schema`,
`#/app/utils/env.server`, `./image-crop`) or have no cross-references.

**Step 5: Create barrel**

Create `app/modules/drinks/index.ts`:

```ts
// Types
export type { EnhancedDrink } from "./implementation/types";

// Queries
export {
  getAllDrinks,
  getPublishedDrinks,
  getDrinkBySlug,
  getDrinksByTag,
  getAllTags,
  createDrink,
  updateDrink,
  deleteDrink,
} from "./implementation/queries.server";

// Validation
export { drinkFormSchema } from "./implementation/validation";

// View helpers
export { withPlaceholderImages } from "./implementation/placeholder-images.server";
export { parseImageUpload } from "./implementation/parse-image-upload.server";
export { markdownToHtml } from "./implementation/markdown.server";

// Image management (used by route actions until mutations consolidation)
export { uploadImageOrPlaceholder, deleteImage } from "./implementation/imagekit.server";

// Cache
export { purgeDrinkCache } from "./implementation/fastly.server";
export { getSurrogateKeyForTag } from "./implementation/tags";

// UI
export { DrinkDetails } from "./ui/drink-details";
export { DrinkList } from "./ui/drink-list";
export { DrinkSummary } from "./ui/drink-summary";
export { DrinkForm } from "./ui/drink-form";
export { type ImageCropHandle, ImageCrop } from "./ui/image-crop";
export { Glass } from "./ui/glass";
export { Tag } from "./ui/tag";
export { TagLink } from "./ui/tag-link";
export { useSortableData } from "./ui/use-sortable-data";
```

**Step 6: Update all route consumers**

Every route that imported from `#/app/models/drink.server`, `#/app/drinks/*`, `#/app/admin/*`,
`#/app/tags/*`, `#/app/validation/*`, `#/app/utils/imagekit*`, `#/app/utils/fastly*`,
`#/app/utils/markdown*`, `#/app/utils/placeholder-images*`, or `#/app/utils/parse-image-upload*`
now imports from `#/app/modules/drinks`.

| File | Old import sources | Symbols |
| --- | --- | --- |
| `routes/_app._index.tsx` | `#/app/drinks/drink-list`, `#/app/models/drink.server`, `#/app/utils/placeholder-images.server` | `DrinkList`, `getPublishedDrinks`, `withPlaceholderImages` |
| `routes/_app.$slug.tsx` | `#/app/drinks/glass`, `#/app/drinks/drink-summary`, `#/app/drinks/drink-details`, `#/app/models/drink.server`, `#/app/utils/markdown.server`, `#/app/utils/placeholder-images.server` | `Glass`, `DrinkSummary`, `DrinkDetails`, `getDrinkBySlug`, `markdownToHtml`, `withPlaceholderImages` |
| `routes/_app.tags._index.tsx` | `#/app/models/drink.server`, `#/app/tags/tag-link`, `#/app/tags/tag`, `#/app/tags/utils` | `getAllTags`, `TagLink`, `Tag`, `getSurrogateKeyForTag` |
| `routes/_app.tags.$tag.tsx` | `#/app/drinks/drink-list`, `#/app/models/drink.server`, `#/app/tags/utils`, `#/app/utils/placeholder-images.server` | `DrinkList`, `getDrinksByTag`, `getSurrogateKeyForTag`, `withPlaceholderImages` |
| `routes/admin.drinks._index.tsx` | `#/app/admin/use-sortable-data`, `#/app/models/drink.server` | `useSortableData`, `getAllDrinks` |
| `routes/admin.drinks.new.tsx` | `#/app/models/drink.server`, `#/app/utils/imagekit.server`, `#/app/admin/drink-form`, `#/app/utils/parse-image-upload.server`, `#/app/utils/fastly.server`, `#/app/validation/drink` | `createDrink`, `uploadImageOrPlaceholder`, `DrinkForm`, `parseImageUpload`, `purgeDrinkCache`, `drinkFormSchema` |
| `routes/admin.drinks.$slug.edit.tsx` | `#/app/models/drink.server`, `#/app/utils/imagekit.server`, `#/app/admin/drink-form`, `#/app/utils/parse-image-upload.server`, `#/app/utils/fastly.server`, `#/app/validation/drink` | `getDrinkBySlug`, `updateDrink`, `uploadImageOrPlaceholder`, `deleteImage`, `DrinkForm`, `parseImageUpload`, `purgeDrinkCache`, `drinkFormSchema` |
| `routes/admin.drinks.$slug.delete.tsx` | `#/app/models/drink.server`, `#/app/utils/imagekit.server`, `#/app/utils/fastly.server` | `getDrinkBySlug`, `deleteDrink`, `deleteImage`, `purgeDrinkCache` |
| `routes/_app.search/route.tsx` | `#/app/utils/placeholder-images.server`, `#/app/drinks/drink-list` | `withPlaceholderImages`, `DrinkList` |

For each file: replace the old scattered imports with a single import from `#/app/modules/drinks`.
Keep the `#/app/search/*` imports alone — those move in Task 4.

Also update `app/search/cache.server.ts` (not yet moved):

```diff
-import { getPublishedDrinks } from "#/app/models/drink.server";
+import { getPublishedDrinks } from "#/app/modules/drinks";
```

**Step 7: Delete empty old directories**

```bash
rm -r app/models app/admin app/drinks app/tags app/validation
```

**Step 8: Verify**

```bash
pnpm typecheck && pnpm lint && pnpm format
```

**Step 9: Commit**

```
refactor: create drinks module
```

---

## Task 4: Create search module

Move 6 files into `app/modules/search/`, consolidate cache + minisearch into a single
`search.server.ts` with a simpler public API, create barrel, update consumers.

**Design change:** The current public API exposes `getSearchData()` and
`searchDrinks(index, query)` separately. The new module hides caching and indexing behind a single
`searchDrinks(query): Promise<Drink[]>` function. This is a deeper interface.

**Files to move:**

| Old path | New path |
| --- | --- |
| `app/routes/_app.search/search-form.tsx` | `app/modules/search/ui/search-form.tsx` |
| `app/routes/_app.search/no-search-term.tsx` | `app/modules/search/ui/no-search-term.tsx` |
| `app/routes/_app.search/no-drinks-found.tsx` | `app/modules/search/ui/no-drinks-found.tsx` |
| `app/routes/_app.search/searching.tsx` | `app/modules/search/ui/searching.tsx` |

Plus one new file created by merging `app/search/cache.server.ts` and
`app/search/minisearch.server.ts`: `app/modules/search/implementation/search.server.ts`

**Step 1: Create directories and move UI files**

```bash
mkdir -p app/modules/search/implementation app/modules/search/ui
git mv app/routes/_app.search/search-form.tsx app/modules/search/ui/search-form.tsx
git mv app/routes/_app.search/no-search-term.tsx app/modules/search/ui/no-search-term.tsx
git mv app/routes/_app.search/no-drinks-found.tsx app/modules/search/ui/no-drinks-found.tsx
git mv app/routes/_app.search/searching.tsx app/modules/search/ui/searching.tsx
```

**Step 2: Create consolidated search implementation**

Create `app/modules/search/implementation/search.server.ts` by merging the logic from
`app/search/cache.server.ts` and `app/search/minisearch.server.ts`:

```ts
import { remember, forget } from "@epic-web/remember";
import MiniSearch from "minisearch";
import { getPublishedDrinks } from "#/app/modules/drinks";
import type { Drink } from "#/app/db/schema";

const CACHE_KEY = "minisearch-index";

type SearchableDrink = {
  id: string;
  slug: string;
  title: string;
  ingredients: string;
  notes: string;
};

type SearchData = {
  allDrinks: Drink[];
  searchIndex: MiniSearch<SearchableDrink>;
};

function createSearchIndex(drinks: Drink[]): MiniSearch<SearchableDrink> {
  const searchableDrinks: SearchableDrink[] = drinks.map((drink) => ({
    id: drink.slug,
    slug: drink.slug,
    title: drink.title,
    ingredients: drink.ingredients.join(" "),
    notes: drink.notes ?? "",
  }));

  const miniSearch = new MiniSearch<SearchableDrink>({
    fields: ["title", "ingredients", "notes"],
    storeFields: ["slug"],
    searchOptions: {
      boost: { title: 3, ingredients: 2, notes: 1 },
      fuzzy: 0.2,
      prefix: true,
    },
  });

  miniSearch.addAll(searchableDrinks);
  return miniSearch;
}

async function getSearchData(): Promise<SearchData> {
  return remember(CACHE_KEY, async () => {
    const allDrinks = await getPublishedDrinks();
    const searchIndex = createSearchIndex(allDrinks);
    return { allDrinks, searchIndex };
  });
}

export async function searchDrinks(query: string): Promise<Drink[]> {
  const { allDrinks, searchIndex } = await getSearchData();
  const results = searchIndex.search(query, { combineWith: "AND" });

  return results
    .map((result) => allDrinks.find((drink) => drink.slug === result.slug))
    .filter((drink): drink is Drink => Boolean(drink));
}

export function purgeSearchCache() {
  forget(CACHE_KEY);
}
```

**Step 3: Delete old search files**

```bash
rm app/search/cache.server.ts app/search/minisearch.server.ts
rm -r app/search
```

**Step 4: Create barrel**

Create `app/modules/search/index.ts`:

```ts
export { searchDrinks, purgeSearchCache } from "./implementation/search.server";
export { SearchForm } from "./ui/search-form";
export { NoSearchTerm } from "./ui/no-search-term";
export { NoDrinksFound } from "./ui/no-drinks-found";
export { Searching } from "./ui/searching";
```

**Step 5: Update route consumers**

`routes/_app.search/route.tsx` — replace all search-related imports:

Before:

```ts
import { withPlaceholderImages } from "#/app/utils/placeholder-images.server";
import { DrinkList } from "#/app/drinks/drink-list";
import type { Drink } from "#/app/db/schema";
import type { AppRouteHandle } from "#/app/types";
import { searchDrinks } from "#/app/search/minisearch.server";
import { getSearchData } from "#/app/search/cache.server";
import { NoDrinksFound } from "./no-drinks-found";
import { NoSearchTerm } from "./no-search-term";
import { SearchForm } from "./search-form";
import { Searching } from "./searching";
```

After (already partially updated in Task 3 for drinks imports):

```ts
import { DrinkList, withPlaceholderImages } from "#/app/modules/drinks";
import type { AppRouteHandle } from "#/app/types";
import {
  searchDrinks,
  SearchForm,
  NoDrinksFound,
  NoSearchTerm,
  Searching,
} from "#/app/modules/search";
```

Also simplify the loader — `searchDrinks` now returns `Drink[]` directly:

Before:

```ts
const { allDrinks, searchIndex } = await getSearchData();
const slugs = searchDrinks(searchIndex, q);
// ...
const drinks = slugs
  .map((slug) => allDrinks.find((drink) => drink.slug === slug))
  .filter((drink): drink is Drink => Boolean(drink));
const drinksWithPlaceholderImages = await withPlaceholderImages(drinks);
```

After:

```ts
const drinks = await searchDrinks(q);
const drinksWithPlaceholderImages = await withPlaceholderImages(drinks);
```

The `type Drink` import from `#/app/db/schema` is no longer needed — remove it.

Update `purgeSearchCache` imports in admin routes:

| File | Old import | New import |
| --- | --- | --- |
| `routes/admin.drinks.new.tsx` | `#/app/search/cache.server` | `#/app/modules/search` |
| `routes/admin.drinks.$slug.edit.tsx` | `#/app/search/cache.server` | `#/app/modules/search` |
| `routes/admin.drinks.$slug.delete.tsx` | `#/app/search/cache.server` | `#/app/modules/search` |

**Step 6: Verify**

```bash
pnpm typecheck && pnpm lint && pnpm format
```

**Step 7: Commit**

```
refactor: create search module
```

---

## Task 5: Consolidate drinks mutations

Create `mutations.server.ts` that orchestrates the full side-effect chain (DB + ImageKit + Fastly
+ search cache) for create/update/delete. Update the barrel to export these instead of the raw DB
functions. Simplify route actions.

**Cross-module dependency:** `drinks/mutations.server.ts` imports `purgeSearchCache` from
`#/app/modules/search`. This creates a bidirectional dependency (search also imports
`getPublishedDrinks` from drinks). This is fine — both are function references, no circular
initialization issues.

**Files:**
- Create: `app/modules/drinks/implementation/mutations.server.ts`
- Modify: `app/modules/drinks/index.ts`
- Modify: `routes/admin.drinks.new.tsx`
- Modify: `routes/admin.drinks.$slug.edit.tsx`
- Modify: `routes/admin.drinks.$slug.delete.tsx`

**Step 1: Create mutations.server.ts**

Create `app/modules/drinks/implementation/mutations.server.ts`:

```ts
import type { z } from "zod";
import type { Drink } from "#/app/db/schema";
import {
  createDrink as insertDrink,
  updateDrink as patchDrink,
  deleteDrink as removeDrink,
} from "./queries.server";
import { uploadImageOrPlaceholder, deleteImage } from "./imagekit.server";
import { purgeDrinkCache } from "./fastly.server";
import { purgeSearchCache } from "#/app/modules/search";
import type { drinkFormSchema } from "./validation";

type DrinkFormData = z.infer<typeof drinkFormSchema>;

type ImageUpload = {
  buffer: Buffer;
  contentType: string;
};

export async function createDrink(
  data: DrinkFormData,
  imageUpload: ImageUpload,
): Promise<Drink> {
  const { url: imageUrl, fileId: imageFileId } = await uploadImageOrPlaceholder(
    imageUpload.buffer,
    `${data.slug}.jpg`,
  );

  const drink = await insertDrink({
    ...data,
    imageUrl,
    imageFileId,
  });

  try {
    purgeSearchCache();
    await purgeDrinkCache({ slug: drink.slug, tags: drink.tags });
  } catch (error) {
    console.error("Cache invalidation failed:", error);
  }

  return drink;
}

export async function updateDrink(
  existingDrink: Drink,
  data: DrinkFormData,
  imageUpload?: ImageUpload,
  keepExistingImage?: boolean,
): Promise<Drink> {
  let imageUrl: string;
  let imageFileId: string;

  if (imageUpload) {
    const result = await uploadImageOrPlaceholder(imageUpload.buffer, `${data.slug}.jpg`);
    imageUrl = result.url;
    imageFileId = result.fileId;

    if (existingDrink.imageFileId && existingDrink.imageFileId !== "test-placeholder") {
      try {
        await deleteImage(existingDrink.imageFileId);
      } catch (error) {
        console.error("Failed to delete old image:", error);
      }
    }
  } else if (keepExistingImage) {
    imageUrl = existingDrink.imageUrl;
    imageFileId = existingDrink.imageFileId;
  } else {
    imageUrl = `https://via.placeholder.com/400x400.png?text=${encodeURIComponent(data.slug)}`;
    imageFileId = "test-placeholder";
  }

  const drink = await patchDrink(existingDrink.id, {
    ...data,
    imageUrl,
    imageFileId,
  });

  try {
    purgeSearchCache();
    const allTags = [...new Set([...existingDrink.tags, ...data.tags])];
    await purgeDrinkCache({ slug: data.slug, tags: allTags });
    if (existingDrink.slug !== data.slug) {
      await purgeDrinkCache({ slug: existingDrink.slug, tags: [] });
    }
  } catch (error) {
    console.error("Cache invalidation failed:", error);
  }

  return drink;
}

export async function deleteDrink(existingDrink: Drink): Promise<void> {
  if (existingDrink.imageFileId && existingDrink.imageFileId !== "test-placeholder") {
    try {
      await deleteImage(existingDrink.imageFileId);
    } catch (error) {
      console.error("Failed to delete drink image:", error);
    }
  }

  await removeDrink(existingDrink.id);

  try {
    purgeSearchCache();
    await purgeDrinkCache({ slug: existingDrink.slug, tags: existingDrink.tags });
  } catch (error) {
    console.error("Cache invalidation failed:", error);
  }
}
```

**Step 2: Update barrel**

Modify `app/modules/drinks/index.ts` — swap query-level mutations for orchestrating mutations,
and remove the now-internal ImageKit/Fastly/purgeSearchCache exports:

```diff
 // Queries
 export {
   getAllDrinks,
   getPublishedDrinks,
   getDrinkBySlug,
   getDrinksByTag,
   getAllTags,
-  createDrink,
-  updateDrink,
-  deleteDrink,
 } from "./implementation/queries.server";

+// Mutations (orchestrate DB + ImageKit + Fastly + search cache)
+export { createDrink, updateDrink, deleteDrink } from "./implementation/mutations.server";

 // Validation
 export { drinkFormSchema } from "./implementation/validation";

 // View helpers
 export { withPlaceholderImages } from "./implementation/placeholder-images.server";
 export { parseImageUpload } from "./implementation/parse-image-upload.server";
 export { markdownToHtml } from "./implementation/markdown.server";

-// Image management (used by route actions until mutations consolidation)
-export { uploadImageOrPlaceholder, deleteImage } from "./implementation/imagekit.server";
-
-// Cache
-export { purgeDrinkCache } from "./implementation/fastly.server";
 export { getSurrogateKeyForTag } from "./implementation/tags";
```

**Step 3: Simplify route actions**

`routes/admin.drinks.new.tsx` — replace the entire file with:

```ts
import { redirect, href, data } from "react-router";
import { getSession, commitSession } from "#/app/modules/auth";
import { createDrink, drinkFormSchema, parseImageUpload, DrinkForm } from "#/app/modules/drinks";
import type { Route } from "./+types/admin.drinks.new";

export default function NewDrinkPage({ actionData }: Route.ComponentProps) {
  return (
    <div>
      <title>New Drink | drinks.fyi</title>
      <h1 className="mb-6 text-2xl font-medium text-zinc-200">Add New Drink</h1>
      <DrinkForm action={href("/admin/drinks/new")} errors={actionData?.errors} />
    </div>
  );
}

export async function action({ request }: Route.ActionArgs) {
  const { formData, imageUpload, imageError } = await parseImageUpload(request);

  if (imageError) {
    return data({ errors: [imageError] }, { status: 400 });
  }

  const result = drinkFormSchema.safeParse(Object.fromEntries(formData));

  if (!result.success) {
    return data({ errors: result.error.issues.map((issue) => issue.message) }, { status: 400 });
  }

  if (!imageUpload) {
    return data({ errors: ["Image is required"] }, { status: 400 });
  }

  await createDrink(result.data, imageUpload);

  const session = await getSession(request.headers.get("Cookie"));
  session.flash("toast", { kind: "success" as const, message: `${result.data.title} created!` });
  return redirect(href("/admin/drinks"), {
    headers: { "Set-Cookie": await commitSession(session) },
  });
}
```

`routes/admin.drinks.$slug.edit.tsx` — replace the entire file with:

```ts
import { redirect, href, data } from "react-router";
import { invariantResponse } from "@epic-web/invariant";
import { getSession, commitSession } from "#/app/modules/auth";
import {
  getDrinkBySlug,
  updateDrink,
  DrinkForm,
  drinkFormSchema,
  parseImageUpload,
} from "#/app/modules/drinks";
import type { Route } from "./+types/admin.drinks.$slug.edit";

export async function loader({ params }: Route.LoaderArgs) {
  const drink = await getDrinkBySlug(params.slug);
  invariantResponse(drink, "Drink not found", { status: 404 });
  return { drink };
}

export default function EditDrinkPage({ loaderData, actionData }: Route.ComponentProps) {
  const { drink } = loaderData;

  return (
    <div>
      <title>{`Edit ${drink.title} | drinks.fyi`}</title>
      <h1 className="mb-6 text-2xl font-medium text-zinc-200">Edit Drink</h1>
      <DrinkForm
        drink={drink}
        action={href("/admin/drinks/:slug/edit", { slug: drink.slug })}
        errors={actionData?.errors}
      />
    </div>
  );
}

export async function action({ request, params }: Route.ActionArgs) {
  const drink = await getDrinkBySlug(params.slug);
  invariantResponse(drink, "Drink not found", { status: 404 });

  const { formData, imageUpload, imageError } = await parseImageUpload(request);

  if (imageError) {
    return data({ errors: [imageError] }, { status: 400 });
  }

  const existingImageUrl = String(formData.get("existingImageUrl") ?? "");

  const result = drinkFormSchema.safeParse(Object.fromEntries(formData));

  if (!result.success) {
    return data({ errors: result.error.issues.map((issue) => issue.message) }, { status: 400 });
  }

  await updateDrink(drink, result.data, imageUpload, Boolean(existingImageUrl));

  const session = await getSession(request.headers.get("Cookie"));
  session.flash("toast", { kind: "success" as const, message: `${result.data.title} updated!` });
  return redirect(href("/admin/drinks"), {
    headers: { "Set-Cookie": await commitSession(session) },
  });
}
```

`routes/admin.drinks.$slug.delete.tsx` — replace the entire file with:

```ts
import { redirect, data, href } from "react-router";
import { invariantResponse } from "@epic-web/invariant";
import { getSession, commitSession } from "#/app/modules/auth";
import { getDrinkBySlug, deleteDrink } from "#/app/modules/drinks";
import type { Route } from "./+types/admin.drinks.$slug.delete";

export async function loader() {
  return redirect(href("/admin/drinks"));
}

export async function action({ request, params }: Route.ActionArgs) {
  const drink = await getDrinkBySlug(params.slug);
  invariantResponse(drink, "Drink not found", { status: 404 });

  await deleteDrink(drink);

  const session = await getSession(request.headers.get("Cookie"));
  session.flash("toast", { kind: "success" as const, message: `${drink.title} deleted!` });
  return data({ success: true }, { headers: { "Set-Cookie": await commitSession(session) } });
}
```

**Step 4: Verify**

```bash
pnpm typecheck && pnpm lint && pnpm format
```

**Step 5: Commit**

```
refactor: consolidate drink mutations into module
```

---

## Task 6: Write auth module tests

**Files:**
- Create: `app/modules/auth/index.test.ts`

**Step 1: Write tests**

Create `app/modules/auth/index.test.ts`:

```ts
import { describe, expect, test } from "vitest";
import { safeRedirectTo, createReturnToUrl } from "./index";

describe("safeRedirectTo", () => {
  test("returns the path for a valid relative URL", () => {
    expect(safeRedirectTo("/admin")).toBe("/admin");
  });

  test("returns default redirect for null input", () => {
    expect(safeRedirectTo(null)).toBe("/");
  });

  test("returns default redirect for undefined input", () => {
    expect(safeRedirectTo(undefined)).toBe("/");
  });

  test("returns custom default redirect", () => {
    expect(safeRedirectTo(null, "/home")).toBe("/home");
  });

  test("rejects absolute URLs to external hosts", () => {
    expect(safeRedirectTo("https://evil.com")).toBe("/");
  });

  test("rejects protocol-relative URLs", () => {
    expect(safeRedirectTo("//evil.com")).toBe("/");
  });
});

describe("createReturnToUrl", () => {
  test("returns pathname from request URL", () => {
    const request = new Request("https://drinks.fyi/admin/drinks");
    expect(createReturnToUrl(request)).toBe("/admin/drinks");
  });

  test("preserves search params", () => {
    const request = new Request("https://drinks.fyi/search?q=mojito");
    expect(createReturnToUrl(request)).toBe("/search?q=mojito");
  });
});
```

**Step 2: Run tests**

```bash
pnpm test app/modules/auth/index.test.ts
```

Expected: all tests pass. Read the `safeRedirectTo` implementation to ensure test assertions match
its actual validation logic — adjust tests if needed.

**Step 3: Commit**

```
test: add auth module tests
```

---

## Task 7: Write drinks module tests

**Files:**
- Create: `app/modules/drinks/index.test.ts`

These tests run against a real test SQLite DB. The existing `resetAndSeedDatabase()` function
seeds with `TEST_ADMIN_USER` and `TEST_DRINKS` from `playwright/seed-data.ts`.

Since `NODE_ENV=test` (from `.env.test`), ImageKit returns placeholders and Fastly skips purging.
No MSW needed for these tests.

**Step 1: Write tests**

Create `app/modules/drinks/index.test.ts`:

```ts
import { beforeEach, describe, expect, test } from "vitest";
import { resetAndSeedDatabase } from "#/app/db/reset.server";
import {
  getAllDrinks,
  getPublishedDrinks,
  getDrinkBySlug,
  getDrinksByTag,
  getAllTags,
  drinkFormSchema,
  createDrink,
  deleteDrink,
} from "./index";

beforeEach(async () => {
  await resetAndSeedDatabase();
});

describe("queries", () => {
  test("getAllDrinks returns all seeded drinks", async () => {
    const drinks = await getAllDrinks();
    expect(drinks.length).toBeGreaterThan(0);
  });

  test("getPublishedDrinks returns only published drinks", async () => {
    const drinks = await getPublishedDrinks();
    expect(drinks.length).toBeGreaterThan(0);
    expect(drinks.every((drink) => drink.status === "published")).toBe(true);
  });

  test("getDrinkBySlug returns matching drink", async () => {
    const allDrinks = await getAllDrinks();
    const firstDrink = allDrinks[0];
    const found = await getDrinkBySlug(firstDrink.slug);
    expect(found).toBeDefined();
    expect(found!.slug).toBe(firstDrink.slug);
  });

  test("getDrinkBySlug returns undefined for non-existent slug", async () => {
    const found = await getDrinkBySlug("does-not-exist");
    expect(found).toBeUndefined();
  });

  test("getDrinksByTag filters by tag", async () => {
    const allDrinks = await getPublishedDrinks();
    const drinkWithTags = allDrinks.find((drink) => drink.tags.length > 0);
    if (!drinkWithTags) return; // skip if no tagged drinks in seed data

    const tag = drinkWithTags.tags[0];
    const taggedDrinks = await getDrinksByTag(tag);
    expect(taggedDrinks.length).toBeGreaterThan(0);
    expect(taggedDrinks.every((drink) => drink.tags.includes(tag))).toBe(true);
  });

  test("getAllTags returns sorted unique tags", async () => {
    const tags = await getAllTags();
    expect(tags.length).toBeGreaterThan(0);
    // Verify sorted
    const sorted = [...tags].sort();
    expect(tags).toEqual(sorted);
    // Verify unique
    expect(new Set(tags).size).toBe(tags.length);
  });
});

describe("mutations", () => {
  test("createDrink creates a new drink and returns it", async () => {
    const drink = await createDrink(
      {
        title: "Test Cocktail",
        slug: "test-cocktail",
        ingredients: ["gin", "tonic"],
        calories: 150,
        tags: ["gin", "refreshing"],
        notes: null,
        rank: 0,
        status: "published",
      },
      { buffer: Buffer.from("fake-image"), contentType: "image/jpeg" },
    );

    expect(drink.title).toBe("Test Cocktail");
    expect(drink.slug).toBe("test-cocktail");
    expect(drink.id).toBeDefined();

    const found = await getDrinkBySlug("test-cocktail");
    expect(found).toBeDefined();
  });

  test("deleteDrink removes the drink", async () => {
    const allDrinks = await getAllDrinks();
    const drinkToDelete = allDrinks[0];

    await deleteDrink(drinkToDelete);

    const found = await getDrinkBySlug(drinkToDelete.slug);
    expect(found).toBeUndefined();
  });
});

describe("validation", () => {
  test("drinkFormSchema accepts valid input", () => {
    const result = drinkFormSchema.safeParse({
      title: "Margarita",
      slug: "margarita",
      ingredients: "tequila\nlime juice\ntriple sec",
      calories: "200",
      tags: "tequila, citrus",
      notes: "A classic cocktail",
      rank: "1",
      status: "published",
    });
    expect(result.success).toBe(true);
  });

  test("drinkFormSchema rejects invalid slug", () => {
    const result = drinkFormSchema.safeParse({
      title: "Test",
      slug: "INVALID SLUG!!!",
      ingredients: "a",
      calories: "100",
      tags: "a",
      notes: "",
      rank: "0",
      status: "published",
    });
    expect(result.success).toBe(false);
  });

  test("drinkFormSchema rejects missing title", () => {
    const result = drinkFormSchema.safeParse({
      title: "",
      slug: "test",
      ingredients: "a",
      calories: "100",
      tags: "a",
      notes: "",
      rank: "0",
      status: "published",
    });
    expect(result.success).toBe(false);
  });

  test("drinkFormSchema parses newline-separated ingredients", () => {
    const result = drinkFormSchema.safeParse({
      title: "Test",
      slug: "test",
      ingredients: "gin\ntonic\nlime",
      calories: "100",
      tags: "gin",
      notes: "",
      rank: "0",
      status: "published",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.ingredients).toEqual(["gin", "tonic", "lime"]);
    }
  });

  test("drinkFormSchema parses comma-separated tags", () => {
    const result = drinkFormSchema.safeParse({
      title: "Test",
      slug: "test",
      ingredients: "a",
      calories: "100",
      tags: "gin, refreshing, summer",
      notes: "",
      rank: "0",
      status: "published",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.tags).toEqual(["gin", "refreshing", "summer"]);
    }
  });
});
```

**Step 2: Run tests**

```bash
pnpm test app/modules/drinks/index.test.ts
```

Expected: all tests pass. If any fail, read the implementation to understand expected behavior and
fix the test assertions.

**Step 3: Commit**

```
test: add drinks module tests
```

---

## Task 8: Write search module tests

**Files:**
- Create: `app/modules/search/index.test.ts`

These tests need drinks seeded in the DB so the search index has data.

**Step 1: Write tests**

Create `app/modules/search/index.test.ts`:

```ts
import { beforeEach, describe, expect, test } from "vitest";
import { resetAndSeedDatabase } from "#/app/db/reset.server";
import { searchDrinks, purgeSearchCache } from "./index";

beforeEach(async () => {
  await resetAndSeedDatabase();
  // Clear cached search index so each test starts fresh
  purgeSearchCache();
});

describe("searchDrinks", () => {
  test("returns matching drinks for a title query", async () => {
    // Use a term that exists in the seed data - check seed-data.ts for drink titles
    const allDrinks = await searchDrinks("");
    // Empty query should return no results (MiniSearch returns nothing for empty)
    // This might need adjustment based on MiniSearch behavior
    // If empty query fails, use a known seed data term instead
  });

  test("returns empty array for non-matching query", async () => {
    const results = await searchDrinks("xyznonexistent123");
    expect(results).toEqual([]);
  });

  test("returns Drink objects with expected shape", async () => {
    // Search for a term known to exist in seed data
    // Read playwright/seed-data.ts to find a valid search term
    // Then verify the returned objects have Drink shape:
    // { id, slug, title, imageUrl, imageFileId, calories, ingredients, tags, notes, rank, status, createdAt, updatedAt }
  });
});

describe("purgeSearchCache", () => {
  test("causes index rebuild on next search", async () => {
    // Search once to populate cache
    const firstResults = await searchDrinks("a");

    // Purge cache
    purgeSearchCache();

    // Search again - should rebuild index and return same results
    const secondResults = await searchDrinks("a");
    expect(secondResults.length).toBe(firstResults.length);
  });
});
```

**Important:** Before writing final assertions, read `playwright/seed-data.ts` to find actual
drink titles and ingredients in the seed data. Use those for realistic test queries. The template
above has placeholder logic — fill in real search terms.

**Step 2: Run tests**

```bash
pnpm test app/modules/search/index.test.ts
```

**Step 3: Commit**

```
test: add search module tests
```

---

## Task 9: Final verification

**Step 1: Run all module tests**

```bash
pnpm test
```

Expected: all tests pass.

**Step 2: Run validation suite**

```bash
pnpm typecheck && pnpm lint && pnpm format
```

**Step 3: Run E2E tests**

```bash
pnpm test:e2e
```

Expected: all Playwright tests pass (behavior unchanged).

**Step 4: Verify directory structure**

Run `find app/modules -type f | sort` and confirm it matches:

```
app/modules/auth/implementation/authenticator.server.ts
app/modules/auth/implementation/middleware.server.ts
app/modules/auth/implementation/queries.server.ts
app/modules/auth/implementation/session.server.ts
app/modules/auth/implementation/types.ts
app/modules/auth/implementation/utils.server.ts
app/modules/auth/index.test.ts
app/modules/auth/index.ts
app/modules/drinks/implementation/fastly.server.ts
app/modules/drinks/implementation/imagekit.server.ts
app/modules/drinks/implementation/markdown.server.ts
app/modules/drinks/implementation/mutations.server.ts
app/modules/drinks/implementation/parse-image-upload.server.ts
app/modules/drinks/implementation/placeholder-images.server.ts
app/modules/drinks/implementation/queries.server.ts
app/modules/drinks/implementation/tags.ts
app/modules/drinks/implementation/types.ts
app/modules/drinks/implementation/validation.ts
app/modules/drinks/index.test.ts
app/modules/drinks/index.ts
app/modules/drinks/ui/drink-details.tsx
app/modules/drinks/ui/drink-form.tsx
app/modules/drinks/ui/drink-list.tsx
app/modules/drinks/ui/drink-summary.tsx
app/modules/drinks/ui/glass.tsx
app/modules/drinks/ui/image-crop.tsx
app/modules/drinks/ui/tag-link.tsx
app/modules/drinks/ui/tag.tsx
app/modules/drinks/ui/use-sortable-data.ts
app/modules/search/implementation/search.server.ts
app/modules/search/index.test.ts
app/modules/search/index.ts
app/modules/search/ui/no-drinks-found.tsx
app/modules/search/ui/no-search-term.tsx
app/modules/search/ui/search-form.tsx
app/modules/search/ui/searching.tsx
```

Verify these old directories no longer exist:

```
app/admin/
app/auth/
app/drinks/
app/models/
app/search/
app/tags/
app/validation/
```

**Step 5: Spot-check route imports**

Grep for any remaining old import paths:

```bash
grep -r '"#/app/models/' app/routes/ app/modules/ || echo "clean"
grep -r '"#/app/admin/' app/routes/ app/modules/ || echo "clean"
grep -r '"#/app/auth/' app/routes/ app/modules/ || echo "clean"
grep -r '"#/app/drinks/' app/routes/ app/modules/ || echo "clean"
grep -r '"#/app/tags/' app/routes/ app/modules/ || echo "clean"
grep -r '"#/app/validation/' app/routes/ app/modules/ || echo "clean"
grep -r '"#/app/search/' app/routes/ app/modules/ || echo "clean"
grep -r '"#/app/middleware/authorization' app/routes/ app/modules/ || echo "clean"
```

All should print "clean".
