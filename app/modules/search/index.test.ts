import { beforeEach, describe, expect, test } from "vitest";
import { resetAndSeedDatabase } from "#/app/db/reset.server";
import { searchDrinks, purgeSearchCache } from "./index";

beforeEach(async () => {
  await resetAndSeedDatabase();
  purgeSearchCache();
});

describe("searchDrinks", () => {
  test("returns matching drinks for a title query", async () => {
    const results = await searchDrinks("margarita");
    expect(results.length).toBe(1);
    expect(results[0].slug).toBe("test-margarita");
  });

  test("returns matching drinks for an ingredient query", async () => {
    const results = await searchDrinks("bourbon");
    expect(results.length).toBe(1);
    expect(results[0].slug).toBe("test-old-fashioned");
  });

  test("returns empty array for non-matching query", async () => {
    const results = await searchDrinks("xyznonexistent123");
    expect(results).toEqual([]);
  });

  test("returns Drink objects with expected shape", async () => {
    const results = await searchDrinks("mojito");
    expect(results.length).toBe(1);
    const drink = results[0];
    expect(drink).toMatchObject({
      slug: "test-mojito",
      title: "Test Mojito",
      calories: 150,
    });
    expect(drink.id).toBeDefined();
    expect(drink.ingredients).toBeInstanceOf(Array);
    expect(drink.tags).toBeInstanceOf(Array);
  });
});

describe("purgeSearchCache", () => {
  test("causes index rebuild on next search", async () => {
    const firstResults = await searchDrinks("margarita");
    purgeSearchCache();
    const secondResults = await searchDrinks("margarita");
    expect(secondResults.length).toBe(firstResults.length);
  });
});
