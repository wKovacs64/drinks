# MSW Test Mocking Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace all `NODE_ENV === "test"` short-circuits in production code with HTTP-level MSW interception in vitest.

**Architecture:** MSW `setupServer` starts globally in vitest setup. Default handlers intercept ImageKit (upload, delete, CDN) and Fastly (purge) APIs. Production code becomes unconditional.

**Tech Stack:** MSW 2.x (`msw/node`), vitest 4.x, `@imagekit/nodejs`

---

### Task 1: Create MSW test handlers

**Files:**
- Create: `app/test-handlers.ts`

**Step 1: Create the handlers file**

The ImageKit SDK hits these endpoints:
- Upload: `POST https://upload.imagekit.io/api/v1/files/upload`
- Delete: `DELETE https://api.imagekit.io/v1/files/:fileId`

The CDN serves images at `https://ik.imagekit.io/*` (used by `unpic` in `placeholder-images.server.ts`).

Fastly purge: `POST https://api.fastly.com/service/:serviceId/purge`

```ts
import { http, HttpResponse } from "msw";

// 1x1 transparent WebP (smallest valid WebP)
const TINY_WEBP = new Uint8Array([
  0x52, 0x49, 0x46, 0x46, 0x1a, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50,
  0x56, 0x50, 0x38, 0x4c, 0x0d, 0x00, 0x00, 0x00, 0x2f, 0x00, 0x00, 0x00,
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
]);

let uploadCounter = 0;

export const handlers = [
  // ImageKit upload
  http.post("https://upload.imagekit.io/api/v1/files/upload", async ({ request }) => {
    uploadCounter++;
    const formData = await request.formData();
    const fileName = formData.get("fileName") ?? `upload-${uploadCounter}`;

    return HttpResponse.json({
      fileId: `test-fileId-${uploadCounter}`,
      name: String(fileName),
      url: `https://ik.imagekit.io/test/drinks/${fileName}`,
      thumbnailUrl: `https://ik.imagekit.io/test/drinks/tr:n-ik_ml_thumbnail/${fileName}`,
      height: 400,
      width: 400,
      size: 1024,
      filePath: `/drinks/${fileName}`,
      fileType: "image",
    });
  }),

  // ImageKit delete
  http.delete("https://api.imagekit.io/v1/files/:fileId", () => {
    return new HttpResponse(null, { status: 204 });
  }),

  // ImageKit CDN (for blur placeholder generation via unpic)
  http.get("https://ik.imagekit.io/*", () => {
    return new HttpResponse(TINY_WEBP, {
      headers: { "Content-Type": "image/webp" },
    });
  }),

  // Fastly cache purge (safety net — env vars are unpopulated in test,
  // so this only fires if someone explicitly configures them)
  http.post("https://api.fastly.com/service/:serviceId/purge", () => {
    return HttpResponse.json({ status: "ok" });
  }),
];
```

**Step 2: Commit**

```
git add app/test-handlers.ts
git commit -m "test: add MSW handlers for external services"
```

---

### Task 2: Wire MSW into vitest setup

**Files:**
- Modify: `app/test-setup.ts`

**Step 1: Update test-setup.ts to start MSW server**

Replace the entire file with:

```ts
import { afterAll, afterEach, beforeAll } from "vitest";
import { setupServer } from "msw/node";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { getDb } from "#/app/db/client.server";
import { handlers } from "#/app/test-handlers";

migrate(getDb(), { migrationsFolder: "./drizzle" });

const server = setupServer(...handlers);

beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
});

afterEach(() => {
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});
```

Note: `onUnhandledRequest: "error"` ensures any unexpected external HTTP call fails loudly instead of silently leaking.

**Step 2: Run existing tests to make sure nothing breaks**

Run: `pnpm test`

Expected: All existing tests pass. The MSW server is now active but the production code still has its `NODE_ENV` guards, so nothing changes yet — the guards prevent the HTTP calls from happening in the first place.

**Step 3: Commit**

```
git add app/test-setup.ts
git commit -m "test: wire MSW server into vitest setup"
```

---

### Task 3: Clean up imagekit.server.ts

**Files:**
- Modify: `app/modules/drinks/implementation/imagekit.server.ts`

**Step 1: Remove NODE_ENV checks and merge upload functions**

Replace the entire file with:

```ts
import { ImageKit, toFile } from "@imagekit/nodejs";
import { getEnvVars } from "#/app/utils/env.server";

const { IMAGEKIT_PRIVATE_KEY } = getEnvVars();

type UploadResult = {
  url: string;
  fileId: string;
};

function getImageKit() {
  return new ImageKit({
    privateKey: IMAGEKIT_PRIVATE_KEY,
  });
}

export async function uploadImage(file: Buffer, fileName: string): Promise<UploadResult> {
  const imagekit = getImageKit();

  const response = await imagekit.files.upload({
    file: await toFile(file, fileName),
    fileName,
    folder: "/drinks",
  });

  if (!response.url || !response.fileId) {
    throw new Error("ImageKit upload failed: missing url or fileId in response");
  }

  return {
    url: response.url,
    fileId: response.fileId,
  };
}

export async function deleteImage(fileId: string): Promise<void> {
  const imagekit = getImageKit();
  await imagekit.files.delete(fileId);
}
```

Key changes:
- `NODE_ENV` import removed
- `uploadImageOrPlaceholder` merged into `uploadImage` (no conditional logic)
- `deleteImage` no longer short-circuits in test

**Step 2: Run tests — expect failure**

Run: `pnpm test`

Expected: Compilation error — `mutations.server.ts` still imports `uploadImageOrPlaceholder` which no longer exists.

**Step 3: Commit**

```
git add app/modules/drinks/implementation/imagekit.server.ts
git commit -m "refactor: remove NODE_ENV checks from imagekit module"
```

---

### Task 4: Clean up mutations.server.ts

**Files:**
- Modify: `app/modules/drinks/implementation/mutations.server.ts`

**Step 1: Update imports and remove test sentinels**

Replace the entire file with:

```ts
import type { z } from "zod";
import type { Drink } from "#/app/db/schema";
import { purgeSearchCache } from "#/app/modules/search";
import {
  createDrink as insertDrink,
  updateDrink as patchDrink,
  deleteDrink as removeDrink,
} from "./queries.server";
import { uploadImage, deleteImage } from "./imagekit.server";
import { purgeDrinkCache } from "./fastly.server";
import type { drinkFormSchema } from "./validation";

type DrinkFormData = z.infer<typeof drinkFormSchema>;

type ImageUpload = {
  buffer: Buffer;
  contentType: string;
};

export async function createDrink(data: DrinkFormData, imageUpload: ImageUpload): Promise<Drink> {
  const { url: imageUrl, fileId: imageFileId } = await uploadImage(
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
    const result = await uploadImage(imageUpload.buffer, `${data.slug}.jpg`);
    imageUrl = result.url;
    imageFileId = result.fileId;

    if (existingDrink.imageFileId) {
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
    throw new Error("updateDrink requires either imageUpload or keepExistingImage");
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
  if (existingDrink.imageFileId) {
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

Key changes:
- Import `uploadImage` instead of `uploadImageOrPlaceholder`
- `"test-placeholder"` sentinel checks removed (simplified to `if (existingDrink.imageFileId)`)
- Dead `else` branch replaced with `throw new Error` — this is now an invariant violation

**Step 2: Run tests**

Run: `pnpm test`

Expected: All tests pass. The mutation tests now make real HTTP calls to ImageKit which MSW intercepts. The `createDrink` test should now store a realistic ImageKit URL (`https://ik.imagekit.io/test/drinks/test-cocktail.jpg`) instead of a placeholder URL.

**Step 3: Run typecheck and lint**

Run: `pnpm typecheck && pnpm lint`

Expected: Pass. No remaining references to `uploadImageOrPlaceholder`.

**Step 4: Commit**

```
git add app/modules/drinks/implementation/mutations.server.ts
git commit -m "refactor: remove test sentinels from drink mutations"
```

---

### Task 5: Verify onUnhandledRequest catches leaks

This is a sanity check that the MSW `onUnhandledRequest: "error"` config works. No code changes needed.

**Step 1: Temporarily add a fetch to a test to verify unhandled requests error**

In any test file, temporarily add:

```ts
test("msw catches unhandled requests", async () => {
  await expect(fetch("https://httpbin.org/get")).rejects.toThrow();
});
```

**Step 2: Run the test**

Run: `pnpm test`

Expected: The test passes — MSW throws on the unhandled request.

**Step 3: Remove the temporary test**

Delete the test you just added. Do not commit it.

---

### Task 6: Final validation

**Step 1: Run full validation suite**

```
pnpm test && pnpm typecheck && pnpm lint && pnpm format
```

Expected: Everything passes.

**Step 2: Verify no remaining test pollution**

Run: `rg 'NODE_ENV.*test' app/ --type ts` — should only match `env.server.ts` (schema definition) and `[_].reset-db.ts` (legitimate route guard).

Run: `rg 'test-placeholder' app/ --type ts` — should return zero results.

**Step 3: Commit any formatting changes**

```
git add -A
git commit -m "chore: format"
```
