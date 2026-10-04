import { imageUrl } from "#/app/core/images.ts";
import type { Drink } from "#/app/db/schema.ts";
import type { DrinkView } from "./drinks.ts";
import { toDrinkTagViews } from "./drinks-tags.server.ts";

// Transparent 1x1 pixel GIF as fallback when blur placeholder generation fails
const FALLBACK_BLUR_DATA_URL =
  "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
const MAX_CACHED_PLACEHOLDERS = 128;
const PLACEHOLDER_CACHE_LIFETIME_MS = 60 * 60 * 1000;
const blurPlaceholders = new Map<string, { expiresAt: number; result: Promise<string> }>();

/** Generate an ImageKit blur placeholder, falling back for other image sources. */
async function generateBlurDataUrl(imageUrlSource: string): Promise<string> {
  const blurredImageUrl = imageUrl(imageUrlSource, 10, "webp", undefined, 90);
  if (blurredImageUrl === imageUrlSource) return FALLBACK_BLUR_DATA_URL;

  const cached = blurPlaceholders.get(blurredImageUrl);
  if (cached && cached.expiresAt > Date.now()) return cached.result;
  blurPlaceholders.delete(blurredImageUrl);
  if (blurPlaceholders.size >= MAX_CACHED_PLACEHOLDERS) {
    const oldestUrl = blurPlaceholders.keys().next().value;
    if (oldestUrl !== undefined) blurPlaceholders.delete(oldestUrl);
  }
  const entry = {
    expiresAt: Date.now() + PLACEHOLDER_CACHE_LIFETIME_MS,
    result: fetchBlurDataUrl(blurredImageUrl),
  };
  blurPlaceholders.set(blurredImageUrl, entry);
  // A failed request must be retried; replacing/versioning an image creates a different key.
  void entry.result.then((result) => {
    if (result === FALLBACK_BLUR_DATA_URL && blurPlaceholders.get(blurredImageUrl) === entry)
      blurPlaceholders.delete(blurredImageUrl);
  });
  return entry.result;
}

async function fetchBlurDataUrl(blurredImageUrl: string): Promise<string> {
  try {
    const blurredImageResponse = await fetch(blurredImageUrl);
    if (!blurredImageResponse.ok) {
      return FALLBACK_BLUR_DATA_URL;
    }
    const blurredImageArrayBuffer = await blurredImageResponse.arrayBuffer();
    const blurredImageBase64String = btoa(
      String.fromCharCode(...new Uint8Array(blurredImageArrayBuffer)),
    );
    return `data:image/webp;base64,${blurredImageBase64String}`;
  } catch {
    // Fetch failed, use fallback
    return FALLBACK_BLUR_DATA_URL;
  }
}

export async function withPlaceholderImages(drinks: Drink[]): Promise<DrinkView[]> {
  return Promise.all(
    drinks.map(async (drink) => {
      const blurDataUrl = await generateBlurDataUrl(drink.imageUrl);

      return {
        title: drink.title,
        slug: drink.slug,
        image: { url: drink.imageUrl, blurDataUrl },
        ingredients: drink.ingredients,
        calories: drink.calories,
        notes: drink.notes,
        tags: toDrinkTagViews(drink.tags),
      };
    }),
  );
}
