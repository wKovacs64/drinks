import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { http, HttpResponse } from "msw";
import { resetAndSeedDatabase } from "#/app/db/reset.server";
import { server } from "#/test/server";
import {
  getAllDrinks,
  getPublishedDrinks,
  getDrinkBySlug,
  getDrinksByTag,
  getAllTags,
} from "#/app/models/drink.server";
import { drinkFormSchema } from "#/app/validation/drink";
import { createDrink, updateDrink, deleteDrink } from "./mutations.server";

beforeEach(async () => {
  await resetAndSeedDatabase();
});

afterEach(() => {
  server.resetHandlers();
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
    const found = await getDrinkBySlug("test-margarita");
    expect(found).toBeDefined();
    expect(found!.slug).toBe("test-margarita");
  });

  test("getDrinkBySlug returns undefined for non-existent slug", async () => {
    const found = await getDrinkBySlug("does-not-exist");
    expect(found).toBeUndefined();
  });

  test("getDrinksByTag filters by tag", async () => {
    const taggedDrinks = await getDrinksByTag("citrus");
    expect(taggedDrinks.length).toBe(2);
    expect(taggedDrinks.every((drink) => drink.tags.includes("citrus"))).toBe(true);
  });

  test("getAllTags returns sorted unique tags", async () => {
    const tags = await getAllTags();
    expect(tags.length).toBeGreaterThan(0);
    const sorted = [...tags].sort();
    expect(tags).toEqual(sorted);
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
      Buffer.from("fake-image"),
    );

    expect(drink.title).toBe("Test Cocktail");
    expect(drink.slug).toBe("test-cocktail");
    expect(drink.id).toBeDefined();
    expect(drink.imageUrl).toBe("https://ik.imagekit.io/test/drinks/test-cocktail.jpg");
    expect(drink.imageFileId).toMatch(/^test-fileId-\d+$/);

    const found = await getDrinkBySlug("test-cocktail");
    expect(found).toBeDefined();
    expect(found!.imageUrl).toBe("https://ik.imagekit.io/test/drinks/test-cocktail.jpg");
  });

  test("deleteDrink removes the drink", async () => {
    const allDrinks = await getAllDrinks();
    const drinkToDelete = allDrinks[0];

    await deleteDrink(drinkToDelete);

    const found = await getDrinkBySlug(drinkToDelete.slug);
    expect(found).toBeUndefined();
  });

  test("updateDrink updates fields without changing the image", async () => {
    const existingDrink = await getDrinkBySlug("test-margarita");
    expect(existingDrink).toBeDefined();

    const { drink } = await updateDrink(
      existingDrink!,
      {
        title: "Updated Margarita",
        slug: "test-margarita",
        ingredients: ["3 oz tequila", "1.5 oz lime juice"],
        calories: 250,
        tags: ["tequila", "updated"],
        notes: "Updated notes",
        rank: 5,
        status: "published",
      },
      undefined,
    );

    expect(drink.title).toBe("Updated Margarita");
    expect(drink.calories).toBe(250);
    // Image should remain unchanged
    expect(drink.imageUrl).toBe(existingDrink!.imageUrl);
    expect(drink.imageFileId).toBe(existingDrink!.imageFileId);
  });

  test("updateDrink uploads new image and deletes old", async () => {
    const existingDrink = await getDrinkBySlug("test-margarita");
    expect(existingDrink).toBeDefined();

    const { drink } = await updateDrink(
      existingDrink!,
      {
        title: "Test Margarita",
        slug: "test-margarita",
        ingredients: ["2 oz tequila", "1 oz lime juice", "1 oz triple sec"],
        calories: 200,
        tags: ["tequila", "citrus"],
        notes: "A classic test margarita",
        rank: 10,
        status: "published",
      },
      Buffer.from("new-image"),
    );

    expect(drink.imageUrl).toBe("https://ik.imagekit.io/test/drinks/test-margarita.jpg");
    expect(drink.imageFileId).toMatch(/^test-fileId-\d+$/);
    expect(drink.imageFileId).not.toBe(existingDrink!.imageFileId);
  });

  test("updateDrink with slug change", async () => {
    const existingDrink = await getDrinkBySlug("test-margarita");
    expect(existingDrink).toBeDefined();

    const { drink } = await updateDrink(
      existingDrink!,
      {
        title: "Updated Margarita",
        slug: "updated-margarita",
        ingredients: ["2 oz tequila", "1 oz lime juice", "1 oz triple sec"],
        calories: 200,
        tags: ["tequila", "citrus"],
        notes: "A classic test margarita",
        rank: 10,
        status: "published",
      },
      undefined,
    );

    expect(drink.slug).toBe("updated-margarita");
    const foundNew = await getDrinkBySlug("updated-margarita");
    expect(foundNew).toBeDefined();
    const foundOld = await getDrinkBySlug("test-margarita");
    expect(foundOld).toBeUndefined();
  });

  test("updateDrink preserves id and createdAt", async () => {
    const existingDrink = await getDrinkBySlug("test-margarita");
    expect(existingDrink).toBeDefined();

    const { drink } = await updateDrink(
      existingDrink!,
      {
        title: "Modified Margarita",
        slug: "test-margarita",
        ingredients: ["2 oz tequila", "1 oz lime juice", "1 oz triple sec"],
        calories: 200,
        tags: ["tequila", "citrus"],
        notes: "A classic test margarita",
        rank: 10,
        status: "published",
      },
      undefined,
    );

    expect(drink.id).toBe(existingDrink!.id);
    expect(drink.createdAt).toEqual(existingDrink!.createdAt);
  });

  test("deleteDrink throws when image deletion fails", async () => {
    server.use(
      http.delete("https://api.imagekit.io/v1/files/:fileId", () => {
        return HttpResponse.json(
          { message: "Internal Server Error" },
          { status: 500, headers: { "x-should-retry": "false" } },
        );
      }),
    );

    const existingDrink = await getDrinkBySlug("test-margarita");
    expect(existingDrink).toBeDefined();

    await expect(deleteDrink(existingDrink!)).rejects.toThrow();

    // Drink should still exist since deletion was aborted
    const found = await getDrinkBySlug("test-margarita");
    expect(found).toBeDefined();
  });

  test("updateDrink returns staleImageError when old image deletion fails", async () => {
    server.use(
      http.delete("https://api.imagekit.io/v1/files/:fileId", () => {
        return HttpResponse.json(
          { message: "Internal Server Error" },
          { status: 500, headers: { "x-should-retry": "false" } },
        );
      }),
    );

    const existingDrink = await getDrinkBySlug("test-margarita");
    expect(existingDrink).toBeDefined();

    const { drink, staleImageError } = await updateDrink(
      existingDrink!,
      {
        title: "Test Margarita",
        slug: "test-margarita",
        ingredients: ["2 oz tequila", "1 oz lime juice", "1 oz triple sec"],
        calories: 200,
        tags: ["tequila", "citrus"],
        notes: "A classic test margarita",
        rank: 10,
        status: "published",
      },
      Buffer.from("new-image"),
    );

    expect(staleImageError).toBeDefined();
    // DB should still be updated with new image
    expect(drink.imageFileId).not.toBe(existingDrink!.imageFileId);
    expect(drink.imageUrl).toBe("https://ik.imagekit.io/test/drinks/test-margarita.jpg");
  });

  test("updateDrink returns no staleImageError on success", async () => {
    const existingDrink = await getDrinkBySlug("test-margarita");
    expect(existingDrink).toBeDefined();

    const { staleImageError } = await updateDrink(
      existingDrink!,
      {
        title: "Test Margarita",
        slug: "test-margarita",
        ingredients: ["2 oz tequila", "1 oz lime juice", "1 oz triple sec"],
        calories: 200,
        tags: ["tequila", "citrus"],
        notes: "A classic test margarita",
        rank: 10,
        status: "published",
      },
      Buffer.from("new-image"),
    );

    expect(staleImageError).toBeUndefined();
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
