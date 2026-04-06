import { beforeEach, describe, expect, test } from "vitest";
import { getDb } from "#/app/db/client.server";
import { resetAndSeedDatabase } from "#/app/db/reset.server";
import { createDrinksService } from "./drinks.server";
import { purgeSearchCache } from "./drinks-search.server";

beforeEach(async () => {
  await resetAndSeedDatabase();
  purgeSearchCache();
});

function drinksService() {
  return createDrinksService({ db: getDb() });
}

describe("searchPublishedDrinks", () => {
  test("returns matching drinks for a title query", async () => {
    const results = await drinksService().searchPublishedDrinks({ query: "margarita" });
    expect(results.length).toBe(1);
    expect(results[0]?.slug).toBe("test-margarita");
  });

  test("returns matching drinks for an ingredient query", async () => {
    const results = await drinksService().searchPublishedDrinks({ query: "bourbon" });
    expect(results.length).toBe(1);
    expect(results[0]?.slug).toBe("test-old-fashioned");
  });

  test("returns empty array for non-matching query", async () => {
    const results = await drinksService().searchPublishedDrinks({ query: "xyznonexistent123" });
    expect(results).toEqual([]);
  });

  test("returns enhanced drink shape", async () => {
    const results = await drinksService().searchPublishedDrinks({ query: "mojito" });
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
    const service = drinksService();
    const firstResults = await service.searchPublishedDrinks({ query: "margarita" });
    purgeSearchCache();
    const secondResults = await service.searchPublishedDrinks({ query: "margarita" });
    expect(secondResults.length).toBe(firstResults.length);
  });
});
