import "#/test/setup.ts";
import { beforeEach, describe, mock, test } from "remix/test";
import { expect } from "remix/assert";
import { parse, parseSafe } from "remix/data-schema";
import { getDb } from "#/app/db/client.server.ts";
import { drinks } from "#/app/db/schema.ts";
import { resetAndSeedDatabase } from "#/test/database.ts";
import { drinkDraftSchema, SaveDrinkNoticeCodes } from "./drinks.ts";
import {
  createAdminDrinksWriteService,
  createDrinksService,
  purgeSearchCache,
} from "./drinks.server.ts";

type DrinksWriteEffects = Parameters<typeof createAdminDrinksWriteService>[0]["writeEffects"];

type TestDrinksServiceOverrides = {
  db?: ReturnType<typeof getDb>;
  writeEffects?: Partial<DrinksWriteEffects>;
};

function testAdminDrinksWriteService(overrides: TestDrinksServiceOverrides = {}) {
  const defaultWriteEffects = {
    uploadImage: mock.fn<DrinksWriteEffects["uploadImage"]>(),
    deleteImage: mock.fn<DrinksWriteEffects["deleteImage"]>(),
    purgeDrinkCache: mock.fn<DrinksWriteEffects["purgeDrinkCache"]>(),
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
  await db.updateMany(drinks, { status }, { where: { slug } });
}

async function getExistingDrinkEditor(slug: string) {
  const editor = await createDrinksService({ db: getDb() }).findDrinkEditorBySlug(slug);

  if (!editor) {
    throw new Error(`Expected drink editor for slug "${slug}"`);
  }

  return editor;
}

function createReadOnlyService() {
  return createDrinksService({ db: getDb() });
}

describe("createDrinksService", () => {
  test("returns published drinks", async () => {
    const publishedDrinks = await createDrinksService({ db: getDb() }).getPublishedDrinks();

    expect(publishedDrinks.map((drink) => drink.slug)).toEqual([
      "test-margarita",
      "test-mojito",
      "test-old-fashioned",
    ]);
    expect(publishedDrinks[0]).toMatchObject({
      title: "Test Margarita",
      calories: 200,
      notes: "A classic test margarita",
      tags: [
        { displayName: "tequila", slug: "tequila" },
        { displayName: "citrus", slug: "citrus" },
      ],
    });
    expect(typeof publishedDrinks[0]?.image?.url).toBe("string");
    expect(typeof publishedDrinks[0]?.image?.blurDataUrl).toBe("string");
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
    expect(typeof drinkForViewer?.drink.image?.url).toBe("string");
    expect(typeof drinkForViewer?.drink.image?.blurDataUrl).toBe("string");
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
    expect(typeof drinkForViewer?.drink.image?.url).toBe("string");
    expect(typeof drinkForViewer?.drink.image?.blurDataUrl).toBe("string");
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
    await db.updateMany(
      drinks,
      { tags: JSON.stringify(["tequila", "bright citrus"]) },
      { where: { slug: "test-margarita" } },
    );
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
    await db.updateMany(
      drinks,
      { tags: JSON.stringify(["Bright Citrus"]) },
      { where: { slug: "test-margarita" } },
    );
    await db.updateMany(
      drinks,
      { tags: JSON.stringify(["bright-citrus"]) },
      { where: { slug: "test-mojito" } },
    );
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
    await db.updateMany(
      drinks,
      { tags: JSON.stringify(["Tequila!", "bright citrus", "bright-citrus", " "]) },
      { where: { slug: "test-margarita" } },
    );
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
    await db.updateMany(
      drinks,
      { tags: JSON.stringify(["Tequila!", "bright citrus", "bright-citrus", " "]) },
      { where: { slug: "test-margarita" } },
    );
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
    expect(typeof searchResults[0]?.image?.url).toBe("string");
    expect(typeof searchResults[0]?.image?.blurDataUrl).toBe("string");
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
    const uploadImage = mock.fn<DrinksWriteEffects["uploadImage"]>(async () => ({
      url: "https://ik.imagekit.io/test/drinks/test-cocktail.jpg",
      fileId: "new-file-id",
    }));
    const purgeDrinkCache = mock.fn<DrinksWriteEffects["purgeDrinkCache"]>(async () => undefined);
    const service = testAdminDrinksWriteService({
      writeEffects: {
        uploadImage,
        purgeDrinkCache,
      },
    });

    const draft = parse(drinkDraftSchema, {
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

  test("updates through the transport-agnostic admin write boundary", async () => {
    const purgeDrinkCache = mock.fn<DrinksWriteEffects["purgeDrinkCache"]>(async () => undefined);
    const adminWriteService = createAdminDrinksWriteService({
      db: getDb(),
      writeEffects: {
        uploadImage: mock.fn<DrinksWriteEffects["uploadImage"]>(),
        deleteImage: mock.fn<DrinksWriteEffects["deleteImage"]>(),
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
        uploadImage: mock.fn<DrinksWriteEffects["uploadImage"]>(),
        deleteImage: mock.fn<DrinksWriteEffects["deleteImage"]>(),
        purgeDrinkCache: mock.fn<DrinksWriteEffects["purgeDrinkCache"]>(),
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
    const deleteImage = mock.fn<DrinksWriteEffects["deleteImage"]>(async () => undefined);
    const purgeDrinkCache = mock.fn<DrinksWriteEffects["purgeDrinkCache"]>(async () => undefined);
    const adminWriteService = createAdminDrinksWriteService({
      db: getDb(),
      writeEffects: {
        uploadImage: mock.fn<DrinksWriteEffects["uploadImage"]>(),
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
    const deleteImage = mock.fn<DrinksWriteEffects["deleteImage"]>(async () => undefined);
    const purgeDrinkCache = mock.fn<DrinksWriteEffects["purgeDrinkCache"]>(async () => undefined);
    const adminWriteService = createAdminDrinksWriteService({
      db: getDb(),
      writeEffects: {
        uploadImage: mock.fn<DrinksWriteEffects["uploadImage"]>(),
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
        uploadImage: mock.fn<DrinksWriteEffects["uploadImage"]>(async () => ({
          url: "https://ik.imagekit.io/test/drinks/test-margarita.jpg",
          fileId: "new-file-id",
        })),
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
    const uploadImage = mock.fn<DrinksWriteEffects["uploadImage"]>();
    const deleteImage = mock.fn<DrinksWriteEffects["deleteImage"]>();
    const purgeDrinkCache = mock.fn<DrinksWriteEffects["purgeDrinkCache"]>(async () => undefined);

    const service = testAdminDrinksWriteService({
      writeEffects: {
        uploadImage,
        deleteImage,
        purgeDrinkCache,
      },
    });

    const draft = parse(drinkDraftSchema, {
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
    const purgeDrinkCache = mock.fn<DrinksWriteEffects["purgeDrinkCache"]>(async () => undefined);
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
        uploadImage: mock.fn<DrinksWriteEffects["uploadImage"]>(async () => ({
          url: "https://ik.imagekit.io/test/drinks/test-margarita.jpg",
          fileId: "replacement-file-id",
        })),
        deleteImage: mock.fn<DrinksWriteEffects["deleteImage"]>(async () => {
          throw new Error("cleanup failed");
        }),
        purgeDrinkCache: mock.fn<DrinksWriteEffects["purgeDrinkCache"]>(async () => undefined),
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
});

describe("searchPublishedDrinks", () => {
  test("returns matching drinks for an ingredient query", async () => {
    const results = await createReadOnlyService().searchPublishedDrinks({ query: "bourbon" });
    expect(results.length).toBe(1);
    expect(results[0]?.slug).toBe("test-old-fashioned");
  });

  test("returns empty array for non-matching query", async () => {
    const results = await createReadOnlyService().searchPublishedDrinks({
      query: "xyznonexistent123",
    });
    expect(results).toEqual([]);
  });
});

describe("drinkDraftSchema", () => {
  test("accepts valid input", () => {
    const result = parseSafe(drinkDraftSchema, {
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
    const result = parseSafe(drinkDraftSchema, {
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
    const result = parseSafe(drinkDraftSchema, {
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
    const result = parseSafe(drinkDraftSchema, {
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
    expect(result.value.ingredients).toEqual(["gin", "tonic", "lime"]);
  });

  test("parses comma-separated tags", () => {
    const result = parseSafe(drinkDraftSchema, {
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
    expect(result.value.tags).toEqual(["gin", "refreshing", "summer"]);
  });
});
