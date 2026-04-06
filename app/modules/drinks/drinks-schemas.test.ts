import { describe, expect, test } from "vitest";
import { drinkDraftSchema } from "./drinks";

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
