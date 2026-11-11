import { test } from "remix/test";
import { expect } from "remix/assert";
import { galleryPageHeaders, purgeKeysFor } from "./gallery-cache.ts";

test("public gallery pages are shared-cacheable under `all` plus their own key", () => {
  const cases = [
    [{ page: "home" }, "all index"],
    [{ page: "search", query: "" }, "all"],
    [{ page: "search", query: "tequila" }, "all search"],
    [{ page: "tags" }, "all tags"],
    [{ page: "tag", tagSlug: "bright-citrus" }, "all bright-citrus"],
    [{ page: "drink", slug: "test-margarita", visibility: "public" }, "all test-margarita"],
  ] as const;

  for (const [page, surrogateKeys] of cases) {
    expect(galleryPageHeaders(page)).toEqual({
      "Cache-Control":
        "public, max-age=30, s-maxage=31536000, stale-while-revalidate=600, stale-if-error=86400",
      "Surrogate-Key": surrogateKeys,
    });
  }
});

test("an Unpublished drink page shown to an Admin is never shared-cacheable or keyed", () => {
  expect(galleryPageHeaders({ page: "drink", slug: "secret-sour", visibility: "private" })).toEqual(
    { "Cache-Control": "private, no-store" },
  );
});

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

test("a Drink write purges home, search, the tags index, its Drink pages, and its Tag pages", () => {
  expect(
    purgeKeysFor({
      slugs: ["test-margarita", "renamed-margarita"],
      tagSlugs: ["tequila", "bright-citrus"],
    }),
  ).toEqual([
    "index",
    "search",
    "test-margarita",
    "renamed-margarita",
    "tags",
    "tequila",
    "bright-citrus",
  ]);
});
