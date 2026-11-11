import { assertNever } from "#/app/core/assert-never.ts";

type GalleryPage =
  | { page: "home" }
  | { page: "search"; query: string }
  | { page: "tags" }
  | { page: "tag"; tagSlug: string }
  | { page: "drink"; slug: string; visibility: "public" | "private" };

const publicCacheControl =
  "public, max-age=30, s-maxage=31536000, stale-while-revalidate=600, stale-if-error=86400";

export const notFoundHeaders = {
  "Cache-Control": "public, max-age=30, s-maxage=60, must-revalidate",
  "Surrogate-Key": "all",
};

export function galleryPageHeaders(page: GalleryPage) {
  switch (page.page) {
    case "home":
      return publicPageHeaders("index");
    case "search":
      return page.query ? publicPageHeaders("search") : publicPageHeaders();
    case "tags":
      return publicPageHeaders("tags");
    case "tag":
      return publicPageHeaders(page.tagSlug);
    case "drink":
      return page.visibility === "public"
        ? publicPageHeaders(page.slug)
        : { "Cache-Control": "private, no-store" };
    default:
      return assertNever(page);
  }
}

function publicPageHeaders(...pageKeys: string[]) {
  return {
    "Cache-Control": publicCacheControl,
    "Surrogate-Key": ["all", ...pageKeys].join(" "),
  };
}

/**
 * Keys for the pages a Drink write affects: home, search, the tags index, the Drink pages, and the
 * Tag pages. `all` is not one of the fixed keys here; the deploy purges it. Slugs share a namespace
 * with each other and with the fixed keys, so a slug equal to another key over-purges.
 */
export function purgeKeysFor(affectedPages: { drinkSlugs: string[]; tagSlugs: string[] }) {
  return ["index", "search", ...affectedPages.drinkSlugs, "tags", ...affectedPages.tagSlugs];
}
