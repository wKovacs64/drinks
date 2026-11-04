import { env } from "#/app/core/env.ts";

export function getSurrogateKeyForTagSlug(tagSlug: string) {
  return tagSlug;
}

function getSurrogateKeyForCanonicalTag(tag: string) {
  return tag.replaceAll(" ", "_");
}

async function purgeFastlyCache(surrogateKeys: string[]): Promise<void> {
  if (env.NODE_ENV === "development") return;
  if (!env.FASTLY_SERVICE_ID || !env.FASTLY_PURGE_API_KEY) {
    console.log("Fastly not configured, skipping cache purge");
    return;
  }

  const response = await fetch(`https://api.fastly.com/service/${env.FASTLY_SERVICE_ID}/purge`, {
    method: "POST",
    headers: {
      "Fastly-Key": env.FASTLY_PURGE_API_KEY,
      "Surrogate-Key": surrogateKeys.join(" "),
    },
  });

  if (!response.ok) {
    throw new Error(`Fastly cache purge failed (HTTP ${response.status})`);
  }
}

/**
 * Purge targeted cache keys affected by a drink change.
 * The `all` key is intentionally excluded here; it is only purged on deploy.
 */
export async function purgeDrinkCache(affectedPages: {
  slugs: string[];
  tags: string[];
}): Promise<void> {
  const keys = [
    "index",
    "search",
    ...affectedPages.slugs,
    "tags",
    ...affectedPages.tags.map(getSurrogateKeyForCanonicalTag),
  ];
  await purgeFastlyCache(keys);
}
