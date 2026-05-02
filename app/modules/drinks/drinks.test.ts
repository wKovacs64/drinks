import { beforeEach, describe, expect, test, vi } from "vitest";
import { eq } from "drizzle-orm";
import { getDb } from "#/app/db/client.server";
import { drinks } from "#/app/db/schema";
import { resetAndSeedDatabase } from "#/app/db/reset.server";
import { drinkDraftSchema, SaveDrinkNoticeCodes } from "./drinks";
import {
  createAdminDrinksWriteService,
  createDrinksService,
  purgeSearchCache,
} from "./drinks.server";

type TestDrinksServiceOverrides = {
  db?: ReturnType<typeof getDb>;
  writeEffects?: Partial<Parameters<typeof createAdminDrinksWriteService>[0]["writeEffects"]>;
};

function testAdminDrinksWriteService(overrides: TestDrinksServiceOverrides = {}) {
  const defaultWriteEffects = {
    uploadImage: vi.fn(),
    deleteImage: vi.fn(),
    purgeDrinkCache: vi.fn(),
  };

  return createAdminDrinksWriteService({
    db: overrides.db ?? getDb(),
    writeEffects: {
      ...defaultWriteEffects,
      ...overrides.writeEffects,
    },
  });
}

beforeEach(async () => {
  await resetAndSeedDatabase();
  purgeSearchCache();
});

async function setDrinkStatus(slug: string, status: "published" | "unpublished"): Promise<void> {
  const db = getDb();
  await db.update(drinks).set({ status }).where(eq(drinks.slug, slug));
}

async function getExistingDrinkEditor(slug: string) {
  const editor = await createDrinksService({ db: getDb() }).findDrinkEditorBySlug(slug);

  if (!editor) {
    throw new Error(`Expected drink editor for slug "${slug}"`);
  }

  return editor;
}

describe("createDrinksService", () => {
  test("returns published drinks for read-only and default test services", async () => {
    const readOnlyService = createDrinksService({ db: getDb() });
    const defaultService = createDrinksService({ db: getDb() });

    const fromReadOnly = await readOnlyService.getPublishedDrinks();
    const fromDefault = await defaultService.getPublishedDrinks();

    const expectedSlugs = ["test-margarita", "test-mojito", "test-old-fashioned"];
    expect(fromReadOnly.map((drink) => drink.slug)).toEqual(expectedSlugs);
    expect(fromDefault.map((drink) => drink.slug)).toEqual(expectedSlugs);

    expect(fromDefault[0]).toMatchObject({
      title: "Test Margarita",
      calories: 200,
      notes: "A classic test margarita",
      tags: [
        { displayName: "tequila", slug: "tequila" },
        { displayName: "citrus", slug: "citrus" },
      ],
    });
    expect(fromDefault[0]?.image).toEqual({
      url: expect.any(String),
      blurDataUrl: expect.any(String),
    });
  });

  test("loads a new-drink editor with form-shaped defaults", async () => {
    const service = createDrinksService({ db: getDb() });

    const editor = await service.getNewDrinkEditor();

    expect(editor).toEqual({
      mode: "create",
      initialValues: {
        title: "",
        slug: "",
        ingredients: "",
        calories: "",
        tags: "",
        notes: "",
        rank: "0",
        status: "published",
      },
    });
  });

  test("returns null when an editor drink slug is missing", async () => {
    const service = createDrinksService({ db: getDb() });

    const editor = await service.findDrinkEditorBySlug("missing-drink");

    expect(editor).toBeNull();
  });

  test("returns a drink for viewer when a published drink is requested", async () => {
    const service = createDrinksService({ db: getDb() });

    const drinkForViewer = await service.getDrinkBySlug({
      slug: "test-margarita",
      viewerRole: "user",
    });

    expect(drinkForViewer?.visibility).toBe("public");
    expect(drinkForViewer?.drink).toMatchObject({
      title: "Test Margarita",
      slug: "test-margarita",
      calories: 200,
      tags: [
        { displayName: "tequila", slug: "tequila" },
        { displayName: "citrus", slug: "citrus" },
      ],
    });
    expect(drinkForViewer?.drink.image).toEqual({
      url: expect.any(String),
      blurDataUrl: expect.any(String),
    });
    expect(drinkForViewer?.drink.notes).toContain("<p>A classic test margarita</p>");
  });

  test("hides an unpublished drink from non-admin viewers", async () => {
    await setDrinkStatus("test-margarita", "unpublished");
    const service = createDrinksService({ db: getDb() });

    const drinkForViewer = await service.getDrinkBySlug({
      slug: "test-margarita",
      viewerRole: "user",
    });

    expect(drinkForViewer).toBeNull();
  });

  test("returns an unpublished drink to admin viewers with private visibility", async () => {
    await setDrinkStatus("test-margarita", "unpublished");
    const service = createDrinksService({ db: getDb() });

    const drinkForViewer = await service.getDrinkBySlug({
      slug: "test-margarita",
      viewerRole: "admin",
    });

    expect(drinkForViewer?.visibility).toBe("private");
    expect(drinkForViewer?.drink.slug).toBe("test-margarita");
    expect(drinkForViewer?.drink.image).toEqual({
      url: expect.any(String),
      blurDataUrl: expect.any(String),
    });
    expect(drinkForViewer?.drink.notes).toContain("<p>A classic test margarita</p>");
  });

  test("returns the resolved tag and published drinks for a tag slug", async () => {
    const service = createDrinksService({ db: getDb() });

    const taggedDrinks = await service.getDrinksByTagSlug({ tagSlug: "citrus" });

    expect(taggedDrinks?.tag).toEqual({ displayName: "citrus", slug: "citrus" });
    expect(taggedDrinks?.drinks.map((drink) => drink.slug)).toEqual([
      "test-margarita",
      "test-mojito",
    ]);
    expect(taggedDrinks?.drinks[0]?.tags).toEqual([
      { displayName: "tequila", slug: "tequila" },
      { displayName: "citrus", slug: "citrus" },
    ]);
  });

  test("returns published drinks for a multi-word tag slug", async () => {
    const db = getDb();
    await db
      .update(drinks)
      .set({ tags: ["tequila", "bright citrus"] })
      .where(eq(drinks.slug, "test-margarita"));
    const service = createDrinksService({ db });

    const taggedDrinks = await service.getDrinksByTagSlug({ tagSlug: "bright-citrus" });

    expect(taggedDrinks?.tag).toEqual({ displayName: "bright citrus", slug: "bright-citrus" });
    expect(taggedDrinks?.drinks.map((drink) => drink.slug)).toEqual(["test-margarita"]);
    expect(taggedDrinks?.drinks[0]?.tags).toEqual([
      { displayName: "tequila", slug: "tequila" },
      { displayName: "bright citrus", slug: "bright-citrus" },
    ]);
  });

  test("resolves equivalent stored tags to one tag page", async () => {
    const db = getDb();
    await db
      .update(drinks)
      .set({ tags: ["Bright Citrus"] })
      .where(eq(drinks.slug, "test-margarita"));
    await db
      .update(drinks)
      .set({ tags: ["bright-citrus"] })
      .where(eq(drinks.slug, "test-mojito"));
    const service = createDrinksService({ db });

    const taggedDrinks = await service.getDrinksByTagSlug({ tagSlug: "bright-citrus" });

    expect(taggedDrinks?.tag).toEqual({ displayName: "bright citrus", slug: "bright-citrus" });
    expect(taggedDrinks?.drinks.map((drink) => drink.slug)).toEqual([
      "test-margarita",
      "test-mojito",
    ]);
  });

  test("returns all published tags as link-ready tag views", async () => {
    await setDrinkStatus("test-old-fashioned", "unpublished");
    const service = createDrinksService({ db: getDb() });

    const tags = await service.getAllTags();

    expect(tags).toEqual([
      { displayName: "citrus", slug: "citrus" },
      { displayName: "mint", slug: "mint" },
      { displayName: "rum", slug: "rum" },
      { displayName: "tequila", slug: "tequila" },
    ]);
  });

  test("defensively canonicalizes and de-duplicates all published tags", async () => {
    const db = getDb();
    await db
      .update(drinks)
      .set({ tags: ["Tequila!", "bright citrus", "bright-citrus", " "] })
      .where(eq(drinks.slug, "test-margarita"));
    await setDrinkStatus("test-old-fashioned", "unpublished");
    const service = createDrinksService({ db });

    const tags = await service.getAllTags();

    expect(tags).toEqual([
      { displayName: "bright citrus", slug: "bright-citrus" },
      { displayName: "citrus", slug: "citrus" },
      { displayName: "mint", slug: "mint" },
      { displayName: "rum", slug: "rum" },
      { displayName: "tequila", slug: "tequila" },
    ]);
  });

  test("defensively canonicalizes stored tags when returning drink views", async () => {
    const db = getDb();
    await db
      .update(drinks)
      .set({ tags: ["Tequila!", "bright citrus", "bright-citrus", " "] })
      .where(eq(drinks.slug, "test-margarita"));
    const service = createDrinksService({ db });

    const drinkForViewer = await service.getDrinkBySlug({
      slug: "test-margarita",
      viewerRole: "user",
    });

    expect(drinkForViewer?.drink.tags).toEqual([
      { displayName: "tequila", slug: "tequila" },
      { displayName: "bright citrus", slug: "bright-citrus" },
    ]);
  });

  test("returns published search results as a direct list", async () => {
    const service = createDrinksService({ db: getDb() });

    const searchResults = await service.searchPublishedDrinks({ query: "tequila" });

    expect(searchResults.map((drink) => drink.slug)).toEqual(["test-margarita"]);
    expect(searchResults[0]?.image).toEqual({
      url: expect.any(String),
      blurDataUrl: expect.any(String),
    });
    expect(searchResults[0]?.tags).toEqual([
      { displayName: "tequila", slug: "tequila" },
      { displayName: "citrus", slug: "citrus" },
    ]);
  });

  test("returns an empty search result list when query is blank", async () => {
    const service = createDrinksService({ db: getDb() });

    const emptySearchResults = await service.searchPublishedDrinks({ query: "" });

    expect(emptySearchResults).toEqual([]);
  });

  test("returns all drinks for admin list views as a direct list", async () => {
    const service = createDrinksService({ db: getDb() });

    const allDrinks = await service.getAllDrinks();

    expect(allDrinks.map((drink) => drink.slug)).toEqual([
      "test-margarita",
      "test-mojito",
      "test-old-fashioned",
    ]);
    expect(allDrinks[0]).toMatchObject({
      title: "Test Margarita",
      status: "published",
      calories: 200,
      rank: 10,
    });
  });
});

describe("createAdminDrinksWriteService", () => {
  test("creates a drink and exposes it through the editor boundary", async () => {
    const uploadImage = vi.fn().mockResolvedValue({
      url: "https://ik.imagekit.io/test/drinks/test-cocktail.jpg",
      fileId: "new-file-id",
    });
    const purgeDrinkCache = vi.fn().mockResolvedValue(undefined);
    const service = testAdminDrinksWriteService({
      writeEffects: {
        uploadImage,
        purgeDrinkCache,
      },
    });

    const draft = drinkDraftSchema.parse({
      title: "Test Cocktail",
      slug: "test-cocktail",
      ingredients: "gin\ntonic",
      calories: "150",
      tags: " Gin, refreshing, gin!, REFRESHING ",
      notes: "",
      rank: "0",
      status: "published",
    });

    const result = await service.create({
      draft,
      imageBuffer: Buffer.from("fake-image"),
    });

    expect(result).toEqual({
      kind: "success",
      drinkSlug: "test-cocktail",
      notices: [],
    });
    expect(uploadImage).toHaveBeenCalledWith(Buffer.from("fake-image"), "test-cocktail.jpg");
    expect(purgeDrinkCache).toHaveBeenCalledWith({
      slugs: ["test-cocktail"],
      tags: ["gin", "refreshing"],
    });

    const editor = await getExistingDrinkEditor("test-cocktail");

    expect(editor).toEqual({
      mode: "edit",
      drinkSlug: "test-cocktail",
      imageUrl: "https://ik.imagekit.io/test/drinks/test-cocktail.jpg",
      initialValues: {
        title: "Test Cocktail",
        slug: "test-cocktail",
        ingredients: "gin\ntonic",
        calories: "150",
        tags: "gin, refreshing",
        notes: "",
        rank: "0",
        status: "published",
      },
    });
  });

  test("creates through the transport-agnostic admin write boundary", async () => {
    const adminWriteService = createAdminDrinksWriteService({
      db: getDb(),
      writeEffects: {
        uploadImage: vi.fn().mockResolvedValue({
          url: "https://ik.imagekit.io/test/drinks/admin-write-cocktail.jpg",
          fileId: "admin-write-file-id",
        }),
        deleteImage: vi.fn().mockResolvedValue(undefined),
        purgeDrinkCache: vi.fn().mockResolvedValue(undefined),
      },
    });

    const result = await adminWriteService.create({
      draft: {
        title: "Admin Write Cocktail",
        slug: "admin-write-cocktail",
        ingredients: ["rye", "vermouth"],
        calories: 175,
        tags: ["rye", "stirred"],
        notes: null,
        rank: 0,
        status: "published",
      },
      imageBuffer: Buffer.from("admin-write-image"),
    });

    expect(result).toEqual({
      kind: "success",
      drinkSlug: "admin-write-cocktail",
      notices: [],
    });

    const editor = await getExistingDrinkEditor("admin-write-cocktail");
    expect(editor.initialValues.title).toBe("Admin Write Cocktail");
    expect(editor.imageUrl).toBe("https://ik.imagekit.io/test/drinks/admin-write-cocktail.jpg");
  });

  test("updates through the transport-agnostic admin write boundary", async () => {
    const purgeDrinkCache = vi.fn().mockResolvedValue(undefined);
    const adminWriteService = createAdminDrinksWriteService({
      db: getDb(),
      writeEffects: {
        uploadImage: vi.fn(),
        deleteImage: vi.fn(),
        purgeDrinkCache,
      },
    });

    const result = await adminWriteService.update({
      slug: "test-margarita",
      draft: {
        title: "Admin Updated Margarita",
        slug: "admin-updated-margarita",
        ingredients: ["tequila", "lime"],
        calories: 210,
        tags: ["tequila", "lime"],
        notes: null,
        rank: 1,
        status: "published",
      },
    });

    expect(result).toEqual({
      kind: "success",
      drinkSlug: "admin-updated-margarita",
      notices: [],
    });
    expect(purgeDrinkCache).toHaveBeenCalledWith({
      slugs: ["test-margarita", "admin-updated-margarita"],
      tags: ["tequila", "citrus", "lime"],
    });

    const editor = await getExistingDrinkEditor("admin-updated-margarita");
    expect(editor.initialValues.title).toBe("Admin Updated Margarita");
  });

  test("returns typed admin write outcomes for duplicate update slugs and missing drinks", async () => {
    const adminWriteService = createAdminDrinksWriteService({
      db: getDb(),
      writeEffects: {
        uploadImage: vi.fn(),
        deleteImage: vi.fn(),
        purgeDrinkCache: vi.fn(),
      },
    });

    const duplicateResult = await adminWriteService.update({
      slug: "test-margarita",
      draft: {
        title: "Duplicate Margarita",
        slug: "test-old-fashioned",
        ingredients: ["tequila"],
        calories: 210,
        tags: ["tequila"],
        notes: null,
        rank: 1,
        status: "published",
      },
    });
    const notFoundResult = await adminWriteService.update({
      slug: "missing-drink",
      draft: {
        title: "Missing Drink",
        slug: "missing-drink",
        ingredients: ["tequila"],
        calories: 210,
        tags: ["tequila"],
        notes: null,
        rank: 1,
        status: "published",
      },
    });

    expect(duplicateResult).toEqual({
      kind: "fieldError",
      fieldErrors: { slug: ["Slug already exists"] },
      formErrors: [],
    });
    expect(notFoundResult).toEqual({ kind: "notFound", slug: "missing-drink" });
  });

  test("deletes through the transport-agnostic admin write boundary", async () => {
    const deleteImage = vi.fn().mockResolvedValue(undefined);
    const purgeDrinkCache = vi.fn().mockResolvedValue(undefined);
    const adminWriteService = createAdminDrinksWriteService({
      db: getDb(),
      writeEffects: {
        uploadImage: vi.fn(),
        deleteImage,
        purgeDrinkCache,
      },
    });

    const result = await adminWriteService.delete({ slug: "test-margarita" });

    expect(result).toEqual({ kind: "success" });
    expect(deleteImage).toHaveBeenCalledWith("seed-fileId-1");
    expect(purgeDrinkCache).toHaveBeenCalledWith({
      slugs: ["test-margarita"],
      tags: ["tequila", "citrus"],
    });
    await expect(
      createDrinksService({ db: getDb() }).findDrinkEditorBySlug("test-margarita"),
    ).resolves.toBeNull();
  });

  test("returns a typed not-found outcome when admin delete cannot find a drink", async () => {
    const deleteImage = vi.fn().mockResolvedValue(undefined);
    const purgeDrinkCache = vi.fn().mockResolvedValue(undefined);
    const adminWriteService = createAdminDrinksWriteService({
      db: getDb(),
      writeEffects: {
        uploadImage: vi.fn(),
        deleteImage,
        purgeDrinkCache,
      },
    });

    const result = await adminWriteService.delete({ slug: "missing-drink" });

    expect(result).toEqual({ kind: "notFound", slug: "missing-drink" });
    expect(deleteImage).not.toHaveBeenCalled();
    expect(purgeDrinkCache).not.toHaveBeenCalled();
  });

  test("returns typed slug error when creating with a duplicate slug", async () => {
    const service = testAdminDrinksWriteService({
      writeEffects: {
        uploadImage: vi.fn().mockResolvedValue({
          url: "https://ik.imagekit.io/test/drinks/test-margarita.jpg",
          fileId: "new-file-id",
        }),
      },
    });

    await expect(
      service.create({
        draft: {
          title: "Duplicate Margarita",
          slug: "test-margarita",
          ingredients: ["gin"],
          calories: 150,
          tags: ["gin"],
          notes: null,
          rank: 0,
          status: "published",
        },
        imageBuffer: Buffer.from("fake-image"),
      }),
    ).resolves.toEqual({
      kind: "fieldError",
      fieldErrors: { slug: ["Slug already exists"] },
      formErrors: [],
    });
  });

  test("updates an existing drink without replacing its image", async () => {
    const uploadImage = vi.fn();
    const deleteImage = vi.fn();
    const purgeDrinkCache = vi.fn().mockResolvedValue(undefined);

    const service = testAdminDrinksWriteService({
      writeEffects: {
        uploadImage,
        deleteImage,
        purgeDrinkCache,
      },
    });

    const draft = drinkDraftSchema.parse({
      title: "Updated Margarita",
      slug: "test-margarita",
      ingredients: "3 oz tequila\n1.5 oz lime juice",
      calories: "250",
      tags: "Tequila, updated, tequila!, UPDATED",
      notes: "Updated notes",
      rank: "5",
      status: "published",
    });

    const result = await service.update({
      slug: "test-margarita",
      draft,
    });

    expect(result).toEqual({
      kind: "success",
      drinkSlug: "test-margarita",
      notices: [],
    });

    expect(uploadImage).not.toHaveBeenCalled();
    expect(deleteImage).not.toHaveBeenCalled();
    expect(purgeDrinkCache).toHaveBeenCalledWith({
      slugs: ["test-margarita"],
      tags: ["tequila", "citrus", "updated"],
    });

    const editor = await getExistingDrinkEditor("test-margarita");

    expect(editor).toEqual({
      mode: "edit",
      drinkSlug: "test-margarita",
      imageUrl:
        "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
      initialValues: {
        title: "Updated Margarita",
        slug: "test-margarita",
        ingredients: "3 oz tequila\n1.5 oz lime juice",
        calories: "250",
        tags: "tequila, updated",
        notes: "Updated notes",
        rank: "5",
        status: "published",
      },
    });
  });

  test("invalidates both old and new detail pages when a drink slug changes", async () => {
    const purgeDrinkCache = vi.fn().mockResolvedValue(undefined);
    const service = testAdminDrinksWriteService({
      writeEffects: {
        purgeDrinkCache,
      },
    });

    await service.update({
      slug: "test-margarita",
      draft: {
        title: "Renamed Margarita",
        slug: "renamed-margarita",
        ingredients: ["2 oz tequila", "1 oz lime juice", "1 oz triple sec"],
        calories: 200,
        tags: ["tequila", "citrus"],
        notes: "A classic test margarita",
        rank: 10,
        status: "published",
      },
    });

    expect(purgeDrinkCache).toHaveBeenCalledWith({
      slugs: ["test-margarita", "renamed-margarita"],
      tags: ["tequila", "citrus"],
    });
  });

  test("returns warning metadata when old image cleanup fails after a successful update", async () => {
    const service = testAdminDrinksWriteService({
      writeEffects: {
        uploadImage: vi.fn().mockResolvedValue({
          url: "https://ik.imagekit.io/test/drinks/test-margarita.jpg",
          fileId: "replacement-file-id",
        }),
        deleteImage: vi.fn().mockRejectedValue(new Error("cleanup failed")),
        purgeDrinkCache: vi.fn().mockResolvedValue(undefined),
      },
    });

    const result = await service.update({
      slug: "test-margarita",
      draft: {
        title: "Test Margarita",
        slug: "test-margarita",
        ingredients: ["2 oz tequila", "1 oz lime juice", "1 oz triple sec"],
        calories: 200,
        tags: ["tequila", "citrus"],
        notes: "A classic test margarita",
        rank: 10,
        status: "published",
      },
      imageBuffer: Buffer.from("new-image"),
    });

    expect(result).toEqual({
      kind: "success",
      drinkSlug: "test-margarita",
      notices: [{ code: SaveDrinkNoticeCodes.oldImageCleanupFailed, message: "cleanup failed" }],
    });

    const editor = await getExistingDrinkEditor("test-margarita");
    expect(editor.initialValues.title).toBe("Test Margarita");
  });

  test("deletes a drink through the admin write boundary", async () => {
    const deleteImage = vi.fn().mockResolvedValue(undefined);
    const purgeDrinkCache = vi.fn().mockResolvedValue(undefined);
    const service = testAdminDrinksWriteService({
      writeEffects: {
        deleteImage,
        purgeDrinkCache,
      },
    });

    await service.delete({ slug: "test-margarita" });

    await expect(
      createDrinksService({ db: getDb() }).findDrinkEditorBySlug("test-margarita"),
    ).resolves.toBeNull();
    expect(deleteImage).toHaveBeenCalledWith("seed-fileId-1");
    expect(purgeDrinkCache).toHaveBeenCalledWith({
      slugs: ["test-margarita"],
      tags: ["tequila", "citrus"],
    });
  });
});

describe("searchPublishedDrinks", () => {
  function readOnlyService() {
    return createDrinksService({ db: getDb() });
  }

  test("returns matching drinks for a title query", async () => {
    const results = await readOnlyService().searchPublishedDrinks({ query: "margarita" });
    expect(results.length).toBe(1);
    expect(results[0]?.slug).toBe("test-margarita");
  });

  test("returns matching drinks for an ingredient query", async () => {
    const results = await readOnlyService().searchPublishedDrinks({ query: "bourbon" });
    expect(results.length).toBe(1);
    expect(results[0]?.slug).toBe("test-old-fashioned");
  });

  test("returns empty array for non-matching query", async () => {
    const results = await readOnlyService().searchPublishedDrinks({ query: "xyznonexistent123" });
    expect(results).toEqual([]);
  });

  test("returns enhanced drink shape", async () => {
    const results = await readOnlyService().searchPublishedDrinks({ query: "mojito" });
    expect(results.length).toBe(1);
    const drink = results[0];
    expect(drink).toMatchObject({
      slug: "test-mojito",
      title: "Test Mojito",
      calories: 150,
    });
    expect(drink?.image.url.length).toBeGreaterThan(0);
    expect(drink?.ingredients).toBeInstanceOf(Array);
    expect(drink?.tags).toBeInstanceOf(Array);
  });
});

describe("purgeSearchCache", () => {
  test("causes index rebuild on next search", async () => {
    const service = createDrinksService({ db: getDb() });
    const firstResults = await service.searchPublishedDrinks({ query: "margarita" });
    purgeSearchCache();
    const secondResults = await service.searchPublishedDrinks({ query: "margarita" });
    expect(secondResults.length).toBe(firstResults.length);
  });
});

describe("drinkDraftSchema", () => {
  test("accepts valid input", () => {
    const result = drinkDraftSchema.safeParse({
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

  test("rejects invalid slug", () => {
    const result = drinkDraftSchema.safeParse({
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

  test("rejects missing title", () => {
    const result = drinkDraftSchema.safeParse({
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

  test("parses newline-separated ingredients", () => {
    const result = drinkDraftSchema.safeParse({
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
    if (!result.success) {
      return;
    }
    expect(result.data.ingredients).toEqual(["gin", "tonic", "lime"]);
  });

  test("parses comma-separated tags", () => {
    const result = drinkDraftSchema.safeParse({
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
    if (!result.success) {
      return;
    }
    expect(result.data.tags).toEqual(["gin", "refreshing", "summer"]);
  });
});
