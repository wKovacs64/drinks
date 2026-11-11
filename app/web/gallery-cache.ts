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
      return publicPageHeaders(page.query ? "search" : undefined);
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

function assertNever(value: never): never {
  throw new Error(`Unexpected gallery page: ${JSON.stringify(value)}`);
}

function publicPageHeaders(pageKey: string | undefined) {
  return {
    "Cache-Control": publicCacheControl,
    "Surrogate-Key": pageKey ? `all ${pageKey}` : "all",
  };
}

/**
 * Keys for the pages a Drink write affects: home, search, the tags index, the Drink pages, and the
 * Tag pages. `all` is excluded; it is only purged on deploy.
 */
export function purgeKeysFor(affectedPages: { slugs: string[]; tagSlugs: string[] }) {
  return ["index", "search", ...affectedPages.slugs, "tags", ...affectedPages.tagSlugs];
}
