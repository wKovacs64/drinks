import "#/test/setup.ts";
import { beforeEach, describe, mock, test, type TestContext } from "remix/test";
import { expect } from "remix/assert";
import { parse, parseSafe, ValidationError } from "remix/data-schema";
import { DataTableDatabaseError, rawSql } from "remix/data-table";
import { http, HttpResponse } from "msw/http";
import { server as requestMocks } from "#/test/server.ts";
import { getDb } from "#/app/db/client.ts";
import { drinks } from "#/app/db/schema.ts";
import { resetAndSeedDatabase } from "#/test/database.ts";
import {
  drinkDraftSchema,
  createAdminDrinksWriteService,
  createDrinksService,
  purgeSearchCache,
} from "./drinks.ts";

type DrinksWriteEffects = Parameters<typeof createAdminDrinksWriteService>[0]["writeEffects"];

type TestDrinksServiceOverrides = {
  db?: ReturnType<typeof getDb>;
  writeEffects?: Partial<DrinksWriteEffects>;
};

function captureLoggedCauses(testContext: TestContext) {
  const logError = testContext.mock.method(console, "error", () => undefined);

  return () => logError.mock.calls.flatMap((call): unknown[] => call.arguments.slice(-1));
}

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

async function withRejectedDrinkWrite(
  operation: "INSERT" | "UPDATE" | "DELETE",
  run: () => Promise<void>,
) {
  const db = getDb();
  await db.exec(
    rawSql(`CREATE TRIGGER reject_drink_write BEFORE ${operation} ON drinks
    BEGIN SELECT RAISE(ABORT, 'forced persistence failure'); END`),
  );

  try {
    await run();
  } finally {
    await db.exec(rawSql("DROP TRIGGER reject_drink_write"));
  }
}

describe("createDrinksService", () => {
  test("reuses successful image placeholders across concurrent and repeated reads", async () => {
    let imageRequests = 0;
    requestMocks.use(
      http.get("https://ik.imagekit.io/performance/reused-placeholder.jpg", () => {
        imageRequests++;

        return new HttpResponse(new Uint8Array([1, 2, 3]), {
          headers: { "Content-Type": "image/webp" },
        });
      }),
    );
    await getDb().updateMany(
      drinks,
      { image_url: "https://ik.imagekit.io/performance/reused-placeholder.jpg?updatedAt=1" },
      { where: { slug: "test-margarita" } },
    );
    const service = createReadOnlyService();

    const [first, concurrent] = await Promise.all([
      service.getDrinkBySlug({ slug: "test-margarita", viewerRole: "user" }),
      service.getDrinkBySlug({ slug: "test-margarita", viewerRole: "user" }),
    ]);

    const repeated = await service.getDrinkBySlug({ slug: "test-margarita", viewerRole: "user" });
    expect(first?.drink.image.blurDataUrl).toBe("data:image/webp;base64,AQID");
    expect(concurrent?.drink.image.blurDataUrl).toBe(first?.drink.image.blurDataUrl);
    expect(repeated?.drink.image.blurDataUrl).toBe(first?.drink.image.blurDataUrl);
    expect(imageRequests).toBe(1);
  });

  test("loads a fresh placeholder when an image URL changes", async () => {
    requestMocks.use(
      http.get(
        "https://ik.imagekit.io/performance/versioned-placeholder.jpg",
        ({ request }) =>
          new HttpResponse(
            new Uint8Array([new URL(request.url).searchParams.get("updatedAt") === "1" ? 1 : 2]),
            { headers: { "Content-Type": "image/webp" } },
          ),
      ),
    );
    const service = createReadOnlyService();

    for (const [version, expectedPlaceholder] of [
      ["1", "AQ=="],
      ["2", "Ag=="],
    ]) {
      await getDb().updateMany(
        drinks,
        {
          image_url: `https://ik.imagekit.io/performance/versioned-placeholder.jpg?updatedAt=${version}`,
        },
        { where: { slug: "test-margarita" } },
      );
      const result = await service.getDrinkBySlug({ slug: "test-margarita", viewerRole: "user" });
      expect(result?.drink.image.blurDataUrl).toBe(`data:image/webp;base64,${expectedPlaceholder}`);
    }
  });

  test("retries a failed placeholder request on the next read", async () => {
    let imageRequests = 0;
    requestMocks.use(
      http.get("https://ik.imagekit.io/performance/retried-placeholder.jpg", () => {
        imageRequests++;

        return imageRequests === 1
          ? new HttpResponse(null, { status: 503 })
          : new HttpResponse(new Uint8Array([1]), { headers: { "Content-Type": "image/webp" } });
      }),
    );
    await getDb().updateMany(
      drinks,
      { image_url: "https://ik.imagekit.io/performance/retried-placeholder.jpg" },
      { where: { slug: "test-margarita" } },
    );
    const service = createReadOnlyService();
    const failed = await service.getDrinkBySlug({ slug: "test-margarita", viewerRole: "user" });
    expect(failed?.drink.image.blurDataUrl).toMatch(/^data:image\/gif;/);
    const retried = await service.getDrinkBySlug({ slug: "test-margarita", viewerRole: "user" });
    expect(retried?.drink.image.blurDataUrl).toBe("data:image/webp;base64,AQ==");
    expect(imageRequests).toBe(2);
  });

  test("returns published drinks", async () => {
    await setDrinkStatus("test-old-fashioned", "unpublished");
    const publishedDrinks = await createDrinksService({ db: getDb() }).getPublishedDrinks();

    expect(publishedDrinks.map((drink) => drink.slug)).toEqual(["test-margarita", "test-mojito"]);
    expect(publishedDrinks[0]).toMatchObject({
      title: "Test Margarita",
      calories: 200,
      notes: "A classic test margarita",
      tags: [
        { displayName: "tequila", slug: "tequila" },
        { displayName: "citrus", slug: "citrus" },
      ],
    });
  });

  test("resolves public and private Drink visibility for the viewer", async () => {
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
    expect(drinkForViewer?.drink.notes).toContain("<p>A classic test margarita</p>");
    await setDrinkStatus("test-margarita", "unpublished");
    expect(await service.getDrinkBySlug({ slug: "test-margarita", viewerRole: "user" })).toBeNull();

    const adminDrink = await service.getDrinkBySlug({
      slug: "test-margarita",
      viewerRole: "admin",
    });

    expect(adminDrink).toMatchObject({
      visibility: "private",
      drink: { slug: "test-margarita", notes: drinkForViewer?.drink.notes },
    });
  });

  test("renders note links to open in a new tab without referrer or ranking credit", async () => {
    await getDb().update(drinks, "test-drink-1", {
      notes: "See [the source](https://example.com/margarita).",
    });

    const result = await createReadOnlyService().getDrinkBySlug({
      slug: "test-margarita",
      viewerRole: "user",
    });

    expect(result?.drink.notes).toBe(
      '<p>See <a target="_blank" rel="noreferrer noopener nofollow" href="https://example.com/margarita">the source</a>.</p>\n',
    );
  });

  test("resolves equivalent stored Tags to one Tag page containing only Published drinks", async () => {
    const db = getDb();
    await db.updateMany(
      drinks,
      { tags: JSON.stringify(["tequila", "Bright Citrus"]) },
      { where: { slug: "test-margarita" } },
    );
    await db.updateMany(
      drinks,
      { tags: JSON.stringify(["bright-citrus"]) },
      { where: { slug: "test-mojito" } },
    );
    await db.updateMany(
      drinks,
      { tags: JSON.stringify(["bright citrus"]), status: "unpublished" },
      { where: { slug: "test-old-fashioned" } },
    );
    const service = createDrinksService({ db });

    const taggedDrinks = await service.getDrinksByTagSlug({ tagSlug: "bright-citrus" });

    expect(taggedDrinks?.tag).toEqual({ displayName: "bright citrus", slug: "bright-citrus" });
    expect(taggedDrinks?.drinks.map((drink) => drink.slug)).toEqual([
      "test-margarita",
      "test-mojito",
    ]);
    expect(taggedDrinks?.drinks[0]?.tags).toEqual([
      { displayName: "tequila", slug: "tequila" },
      { displayName: "bright citrus", slug: "bright-citrus" },
    ]);
  });

  test("canonicalizes stored Tags in both the published Tag list and Drink views", async () => {
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

    const drinkForViewer = await service.getDrinkBySlug({
      slug: "test-margarita",
      viewerRole: "user",
    });

    expect(drinkForViewer?.drink.tags).toEqual([
      { displayName: "tequila", slug: "tequila" },
      { displayName: "bright citrus", slug: "bright-citrus" },
    ]);
  });

  test("search returns only Published drinks and no results for blank or unmatched queries", async () => {
    const db = getDb();
    await db.updateMany(
      drinks,
      { ingredients: JSON.stringify(["2 oz tequila"]), status: "unpublished" },
      { where: { slug: "test-old-fashioned" } },
    );
    const service = createDrinksService({ db });

    const searchResults = await service.searchPublishedDrinks({ query: "tequila" });

    expect(searchResults.map((drink) => drink.slug)).toEqual(["test-margarita"]);
    expect(searchResults[0]?.tags).toEqual([
      { displayName: "tequila", slug: "tequila" },
      { displayName: "citrus", slug: "citrus" },
    ]);

    for (const query of ["", "xyznonexistent123"]) {
      expect(await service.searchPublishedDrinks({ query })).toEqual([]);
    }
  });

  test("returns all drinks for admin list views as a direct list", async () => {
    await setDrinkStatus("test-old-fashioned", "unpublished");
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
    expect(allDrinks[2]?.status).toBe("unpublished");
  });

  test("rejects a stored Drink status outside the known statuses", async () => {
    await getDb().exec(rawSql("UPDATE drinks SET status = 'archived' WHERE slug = 'test-mojito'"));
    const service = createReadOnlyService();

    await expect(service.getAllDrinks()).rejects.toBeInstanceOf(ValidationError);
    await expect(
      service.getDrinkBySlug({ slug: "test-mojito", viewerRole: "admin" }),
    ).rejects.toBeInstanceOf(ValidationError);
    await expect(service.findDrinkEditorBySlug("test-mojito")).rejects.toBeInstanceOf(
      ValidationError,
    );
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
      notices: [],
    });
    expect(uploadImage).toHaveBeenCalledWith(Buffer.from("fake-image"), "test-cocktail.jpg");
    expect(purgeDrinkCache).toHaveBeenCalledWith({
      drinkSlugs: ["test-cocktail"],
      tagSlugs: ["gin", "refreshing"],
    });

    const editor = await getExistingDrinkEditor("test-cocktail");

    expect(editor).toEqual({
      mode: "edit",
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

    expect(duplicateResult).toEqual({ kind: "slugTaken" });
    expect(notFoundResult).toEqual({ kind: "notFound" });
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

    expect(result).toEqual({ kind: "success", notices: [] });
    expect(deleteImage).toHaveBeenCalledWith("seed-fileId-1");
    expect(purgeDrinkCache).toHaveBeenCalledWith({
      drinkSlugs: ["test-margarita"],
      tagSlugs: ["tequila", "citrus"],
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

    expect(result).toEqual({ kind: "notFound" });
    expect(deleteImage).not.toHaveBeenCalled();
    expect(purgeDrinkCache).not.toHaveBeenCalled();
  });

  test("returns a slug-taken outcome without uploading when creating a Drink with a duplicate slug", async () => {
    const uploadImage = mock.fn<DrinksWriteEffects["uploadImage"]>();
    const service = testAdminDrinksWriteService({ writeEffects: { uploadImage } });

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
    ).resolves.toEqual({ kind: "slugTaken" });
    expect(uploadImage).not.toHaveBeenCalled();
  });

  test("renames and updates a Drink without replacing its image", async () => {
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
      slug: "updated-margarita",
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
      notices: [],
    });

    expect(uploadImage).not.toHaveBeenCalled();
    expect(deleteImage).not.toHaveBeenCalled();
    expect(purgeDrinkCache).toHaveBeenCalledWith({
      drinkSlugs: ["test-margarita", "updated-margarita"],
      tagSlugs: ["tequila", "citrus", "updated"],
    });

    expect(await createReadOnlyService().findDrinkEditorBySlug("test-margarita")).toBeNull();
    const editor = await getExistingDrinkEditor("updated-margarita");

    expect(editor).toEqual({
      mode: "edit",
      imageUrl:
        "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
      initialValues: {
        title: "Updated Margarita",
        slug: "updated-margarita",
        ingredients: "3 oz tequila\n1.5 oz lime juice",
        calories: "250",
        tags: "tequila, updated",
        notes: "Updated notes",
        rank: "5",
        status: "published",
      },
    });
  });

  for (const cleanupFails of [false, true]) {
    test(`compensates an upload after failed create and preserves the persistence error${cleanupFails ? " if cleanup fails" : ""}`, async (testContext) => {
      const logError = testContext.mock.method(console, "error", () => undefined);
      const cleanupError = new Error("compensation unavailable");
      const originalEditor = await getExistingDrinkEditor("test-margarita");
      const storedImages = new Set<string>();
      const purgeDrinkCache = mock.fn<DrinksWriteEffects["purgeDrinkCache"]>();

      const deleteImage = mock.fn<DrinksWriteEffects["deleteImage"]>(async (fileId) => {
        if (cleanupFails) throw cleanupError;
        storedImages.delete(fileId);
      });

      const service = testAdminDrinksWriteService({
        writeEffects: {
          uploadImage: async () => {
            storedImages.add("new-image");

            return { url: "data:image/png;base64,AQ==", fileId: "new-image" };
          },
          deleteImage,
          purgeDrinkCache,
        },
      });

      await withRejectedDrinkWrite("INSERT", async () => {
        await expect(
          service.create({
            draft: parse(drinkDraftSchema, {
              ...originalEditor.initialValues,
              slug: "rejected-drink",
            }),
            imageBuffer: Buffer.from("new-image"),
          }),
        ).rejects.toBeInstanceOf(DataTableDatabaseError);
      });
      expect(await createReadOnlyService().findDrinkEditorBySlug("rejected-drink")).toBeNull();
      expect([...storedImages]).toEqual(cleanupFails ? ["new-image"] : []);
      expect(deleteImage).toHaveBeenCalledWith("new-image");
      expect(purgeDrinkCache).not.toHaveBeenCalled();
      expect(logError.mock.calls.map((call): unknown[] => call.arguments)).toEqual(
        cleanupFails
          ? [["Failed to clean up uploaded image after persistence failure:", cleanupError]]
          : [],
      );
    });
  }

  test("retains the referenced image when delete persistence fails", async () => {
    const originalEditor = await getExistingDrinkEditor("test-margarita");
    const storedImages = new Set(["seed-fileId-1"]);
    const purgeDrinkCache = mock.fn<DrinksWriteEffects["purgeDrinkCache"]>();

    const service = testAdminDrinksWriteService({
      writeEffects: {
        deleteImage: async (fileId) => {
          storedImages.delete(fileId);
        },
        purgeDrinkCache,
      },
    });

    await withRejectedDrinkWrite("DELETE", async () => {
      await expect(service.delete({ slug: "test-margarita" })).rejects.toThrow(
        "Database execution failed",
      );
    });
    expect(await getExistingDrinkEditor("test-margarita")).toEqual(originalEditor);
    expect([...storedImages]).toEqual(["seed-fileId-1"]);
    expect(purgeDrinkCache).not.toHaveBeenCalled();
  });

  for (const cleanupFails of [false, true]) {
    test(`retains the referenced image and compensates the upload when update persistence fails${cleanupFails ? " even if compensation fails" : ""}`, async (testContext) => {
      const logError = testContext.mock.method(console, "error", () => undefined);
      const cleanupError = new Error("compensation unavailable");
      const originalEditor = await getExistingDrinkEditor("test-margarita");
      const storedImages = new Set(["seed-fileId-1"]);

      const deleteImage = mock.fn<DrinksWriteEffects["deleteImage"]>(async (fileId) => {
        if (cleanupFails) throw cleanupError;
        storedImages.delete(fileId);
      });

      const purgeDrinkCache = mock.fn<DrinksWriteEffects["purgeDrinkCache"]>();

      const service = testAdminDrinksWriteService({
        writeEffects: {
          uploadImage: async () => {
            storedImages.add("replacement-image");

            return { url: "data:image/png;base64,AQ==", fileId: "replacement-image" };
          },
          deleteImage,
          purgeDrinkCache,
        },
      });

      await withRejectedDrinkWrite("UPDATE", async () => {
        await expect(
          service.update({
            slug: "test-margarita",
            draft: parse(drinkDraftSchema, {
              ...originalEditor.initialValues,
              title: "Rejected Margarita",
            }),
            imageBuffer: Buffer.from("replacement-image"),
          }),
        ).rejects.toBeInstanceOf(DataTableDatabaseError);
      });
      expect(await getExistingDrinkEditor("test-margarita")).toEqual(originalEditor);
      expect([...storedImages]).toEqual(
        cleanupFails ? ["seed-fileId-1", "replacement-image"] : ["seed-fileId-1"],
      );
      expect(deleteImage).toHaveBeenCalledWith("replacement-image");
      expect(purgeDrinkCache).not.toHaveBeenCalled();
      expect(logError.mock.calls.map((call): unknown[] => call.arguments)).toEqual(
        cleanupFails
          ? [["Failed to clean up uploaded image after persistence failure:", cleanupError]]
          : [],
      );
    });
  }

  test("returns both notices, logs both causes, purges, and serves fresh search after committed delete image cleanup and purge fail", async (testContext) => {
    const logError = testContext.mock.method(console, "error", () => undefined);
    const cleanupError = new Error("cleanup unavailable");
    const cacheError = new Error("cache unavailable");
    const readService = createReadOnlyService();
    expect((await readService.searchPublishedDrinks({ query: "margarita" })).length).toBe(1);

    const purgeDrinkCache = mock.fn<DrinksWriteEffects["purgeDrinkCache"]>(async () => {
      throw cacheError;
    });

    const service = testAdminDrinksWriteService({
      writeEffects: {
        deleteImage: async () => {
          throw cleanupError;
        },
        purgeDrinkCache,
      },
    });

    expect(await service.delete({ slug: "test-margarita" })).toEqual({
      kind: "success",
      notices: ["oldImageCleanupFailed", "cacheRefreshFailed"],
    });
    expect(await readService.findDrinkEditorBySlug("test-margarita")).toBeNull();
    expect(await readService.searchPublishedDrinks({ query: "margarita" })).toEqual([]);
    expect(purgeDrinkCache).toHaveBeenCalledWith({
      drinkSlugs: ["test-margarita"],
      tagSlugs: ["tequila", "citrus"],
    });
    expect(logError.mock.calls.map((call): unknown[] => call.arguments)).toEqual([
      [
        "Failed to clean up old image after committed write:",
        { fileId: "seed-fileId-1" },
        cleanupError,
      ],
      [
        "Failed to refresh cache after committed write:",
        { drinkSlugs: ["test-margarita"], tagSlugs: ["tequila", "citrus"] },
        cacheError,
      ],
    ]);
  });

  test("returns a committed create with a cache notice, logged cause, and fresh search when purge fails", async (testContext) => {
    const loggedCauses = captureLoggedCauses(testContext);
    const cacheError = new Error("cache unavailable");
    const readService = createReadOnlyService();
    expect(await readService.searchPublishedDrinks({ query: "negroni" })).toEqual([]);

    const service = testAdminDrinksWriteService({
      writeEffects: {
        uploadImage: async () => ({ url: "data:image/png;base64,AQ==", fileId: "new-image" }),
        purgeDrinkCache: async () => {
          throw cacheError;
        },
      },
    });

    const result = await service.create({
      draft: {
        title: "Committed Negroni",
        slug: "committed-negroni",
        ingredients: ["gin"],
        calories: 200,
        tags: ["gin"],
        notes: null,
        rank: 0,
        status: "published",
      },
      imageBuffer: Buffer.from("new-image"),
    });

    expect(result).toEqual({ kind: "success", notices: ["cacheRefreshFailed"] });
    expect((await getExistingDrinkEditor("committed-negroni")).initialValues.title).toBe(
      "Committed Negroni",
    );
    expect(
      (await readService.searchPublishedDrinks({ query: "negroni" })).map((drink) => drink.slug),
    ).toEqual(["committed-negroni"]);
    expect(loggedCauses()).toEqual([cacheError]);
  });

  test("returns a cache notice, logs the cause, and serves fresh search when purge fails after a rename", async (testContext) => {
    const loggedCauses = captureLoggedCauses(testContext);
    const cacheError = new Error("cache unavailable");
    const readService = createReadOnlyService();
    await readService.searchPublishedDrinks({ query: "margarita" });

    const purgeDrinkCache = mock.fn<DrinksWriteEffects["purgeDrinkCache"]>(async () => {
      throw cacheError;
    });

    const service = testAdminDrinksWriteService({ writeEffects: { purgeDrinkCache } });

    const result = await service.update({
      slug: "test-margarita",
      draft: {
        title: "Committed Negroni",
        slug: "committed-negroni",
        ingredients: ["gin"],
        calories: 200,
        tags: ["gin"],
        notes: null,
        rank: 10,
        status: "published",
      },
    });

    expect(result).toEqual({ kind: "success", notices: ["cacheRefreshFailed"] });
    expect(purgeDrinkCache).toHaveBeenCalledWith({
      drinkSlugs: ["test-margarita", "committed-negroni"],
      tagSlugs: ["tequila", "citrus", "gin"],
    });
    expect(await readService.findDrinkEditorBySlug("test-margarita")).toBeNull();
    expect((await getExistingDrinkEditor("committed-negroni")).initialValues.title).toBe(
      "Committed Negroni",
    );
    expect(
      (await readService.searchPublishedDrinks({ query: "negroni" })).map((drink) => drink.slug),
    ).toEqual(["committed-negroni"]);
    expect(await readService.searchPublishedDrinks({ query: "margarita" })).toEqual([]);
    expect(loggedCauses()).toEqual([cacheError]);
  });

  for (const purgeFails of [false, true]) {
    test(`returns all notices, logs their causes, and still purges after committed update image cleanup fails${purgeFails ? " with purge failure" : ""}`, async (testContext) => {
      const loggedCauses = captureLoggedCauses(testContext);
      const cleanupError = new Error("cleanup failed");
      const cacheError = new Error("cache unavailable");

      const deleteImage = mock.fn<DrinksWriteEffects["deleteImage"]>(async () => {
        throw cleanupError;
      });

      const purgeDrinkCache = mock.fn<DrinksWriteEffects["purgeDrinkCache"]>(async () => {
        if (purgeFails) throw cacheError;
      });

      const service = testAdminDrinksWriteService({
        writeEffects: {
          uploadImage: mock.fn<DrinksWriteEffects["uploadImage"]>(async () => ({
            url: "https://ik.imagekit.io/test/drinks/test-margarita.jpg",
            fileId: "replacement-file-id",
          })),
          deleteImage,
          purgeDrinkCache,
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
        notices: purgeFails
          ? ["oldImageCleanupFailed", "cacheRefreshFailed"]
          : ["oldImageCleanupFailed"],
      });

      const editor = await getExistingDrinkEditor("test-margarita");
      expect(editor).toMatchObject({
        mode: "edit",
        imageUrl: "https://ik.imagekit.io/test/drinks/test-margarita.jpg",
      });
      expect(purgeDrinkCache).toHaveBeenCalledWith({
        drinkSlugs: ["test-margarita"],
        tagSlugs: ["tequila", "citrus"],
      });
      expect(deleteImage.mock.calls.map((call) => call.arguments)).toEqual([["seed-fileId-1"]]);
      expect(loggedCauses()).toEqual(purgeFails ? [cleanupError, cacheError] : [cleanupError]);
    });
  }
});

describe("drinkDraftSchema", () => {
  test("normalizes form input into a transport-independent draft", () => {
    const draft = parse(drinkDraftSchema, {
      title: "Margarita",
      slug: "margarita",
      ingredients: "tequila\nlime juice\ntriple sec",
      calories: "200",
      tags: "tequila, citrus",
      notes: "A classic cocktail",
      rank: "1",
      status: "published",
    });

    expect(draft).toEqual({
      title: "Margarita",
      slug: "margarita",
      ingredients: ["tequila", "lime juice", "triple sec"],
      calories: 200,
      tags: ["tequila", "citrus"],
      notes: "A classic cocktail",
      rank: 1,
      status: "published",
    });
  });

  test("rejects an invalid slug or missing title", () => {
    const validInput = {
      title: "Test",
      slug: "test",
      ingredients: "a",
      calories: "100",
      tags: "a",
      notes: "",
      rank: "0",
      status: "published",
    };

    for (const invalidField of [{ slug: "INVALID SLUG!!!" }, { title: "" }]) {
      expect(parseSafe(drinkDraftSchema, { ...validInput, ...invalidField }).success).toBe(false);
    }
  });

  const validNumberInput = {
    title: "Test",
    slug: "test",
    ingredients: "a",
    calories: "100",
    tags: "a",
    notes: "",
    rank: "0",
    status: "published",
  };

  test("accepts whole numbers, trimming surrounding whitespace", () => {
    for (const [input, expected] of [
      ["42", 42],
      ["0", 0],
      [" 7 ", 7],
    ] as const) {
      const draft = parse(drinkDraftSchema, { ...validNumberInput, calories: input, rank: input });
      expect(draft.calories).toBe(expected);
      expect(draft.rank).toBe(expected);
    }
  });

  test("accepts a negative rank but not negative calories", () => {
    expect(parse(drinkDraftSchema, { ...validNumberInput, rank: "-3" }).rank).toBe(-3);

    const result = parseSafe(drinkDraftSchema, { ...validNumberInput, calories: "-3" });
    expect(result.success ? [] : result.issues.map((issue) => issue.message)).toEqual([
      "Calories cannot be negative",
    ]);
  });

  test("rejects number fields that are not whole numbers", () => {
    for (const input of ["5abc", "1.9", "1e3", "", "abc", "9007199254740993"]) {
      const result = parseSafe(drinkDraftSchema, {
        ...validNumberInput,
        calories: input,
        rank: input,
      });

      expect(result.success ? [] : result.issues.map((issue) => issue.message)).toEqual([
        "Calories must be a whole number",
        "Rank must be a whole number",
      ]);
    }
  });
});
