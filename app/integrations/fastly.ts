import { env } from "#/app/core/env.ts";

export async function purgeSurrogateKeys(keys: string[]): Promise<void> {
  if (env.NODE_ENV === "development") return;

  if (!env.FASTLY_SERVICE_ID || !env.FASTLY_PURGE_API_KEY) {
    console.log("Fastly not configured, skipping cache purge");

    return;
  }

  const response = await fetch(`https://api.fastly.com/service/${env.FASTLY_SERVICE_ID}/purge`, {
    method: "POST",
    headers: {
      "Fastly-Key": env.FASTLY_PURGE_API_KEY,
      "Surrogate-Key": keys.join(" "),
    },
  });

  if (!response.ok) {
    throw new Error(`Fastly cache purge failed (HTTP ${response.status})`);
  }
}
