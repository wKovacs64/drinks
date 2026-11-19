import { imageUrl } from "#/app/core/public/images.ts";

const FALLBACK_BLUR_DATA_URL =
  "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

const MAX_CACHED_PLACEHOLDERS = 128;
const PLACEHOLDER_CACHE_LIFETIME_MS = 60 * 60 * 1000;
const blurPlaceholders = new Map<string, { expiresAt: number; result: Promise<string> }>();

export async function generateBlurDataUrl(imageUrlSource: string): Promise<string> {
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
  void entry.result.then((result) => {
    const failedFetchShouldRetry = result === FALLBACK_BLUR_DATA_URL;

    if (failedFetchShouldRetry && blurPlaceholders.get(blurredImageUrl) === entry)
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
    return FALLBACK_BLUR_DATA_URL;
  }
}
