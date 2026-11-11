import { test } from "remix/test";
import { expect } from "remix/assert";
import { galleryPageHeaders, purgeKeysFor } from "./gallery-cache.ts";

test("every page a Drink write affects carries a key that write purges", () => {
  const purgeKeys = purgeKeysFor({
    slugs: ["test-margarita", "renamed-margarita"],
    tagSlugs: ["tequila", "bright-citrus"],
  });

  const affectedPages = [
    { page: "home" },
    { page: "search", query: "tequila" },
    { page: "tags" },
    { page: "tag", tagSlug: "tequila" },
    { page: "tag", tagSlug: "bright-citrus" },
    { page: "drink", slug: "test-margarita", visibility: "public" },
    { page: "drink", slug: "renamed-margarita", visibility: "public" },
  ] as const;

  for (const page of affectedPages) {
    const pageKeys = new Headers(galleryPageHeaders(page)).get("Surrogate-Key")?.split(" ");

    expect(pageKeys?.some((pageKey) => pageKey !== "all" && purgeKeys.includes(pageKey))).toBe(
      true,
    );
  }
});
