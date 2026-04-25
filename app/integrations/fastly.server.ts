import { getEnvVars } from "#/app/core/env.server";
import { getSurrogateKeyForTag } from "#/app/core/utils";

async function purgeFastlyCache(surrogateKeys: string[]): Promise<void> {
  const { FASTLY_SERVICE_ID, FASTLY_PURGE_API_KEY } = getEnvVars();
  if (!FASTLY_SERVICE_ID || !FASTLY_PURGE_API_KEY) {
    console.log("Fastly not configured, skipping cache purge");
    return;
  }

  const response = await fetch(`https://api.fastly.com/service/${FASTLY_SERVICE_ID}/purge`, {
    method: "POST",
    headers: {
      "Fastly-Key": FASTLY_PURGE_API_KEY,
      "Surrogate-Key": surrogateKeys.join(" "),
    },
  });

  if (!response.ok) {
    console.error("Failed to purge Fastly cache:", await response.text());
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
    ...affectedPages.tags.map(getSurrogateKeyForTag),
  ];
  await purgeFastlyCache(keys);
}
