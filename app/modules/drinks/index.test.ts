import { beforeEach, describe, expect, test } from "vitest";
import { resetAndSeedDatabase } from "#/app/db/reset.server";
import {
  getAllDrinks,
  getPublishedDrinks,
  getDrinkBySlug,
  getDrinksByTag,
  getAllTags,
  createDrink,
  deleteDrink,
} from "./index.server";
import { drinkFormSchema } from "./index";

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
