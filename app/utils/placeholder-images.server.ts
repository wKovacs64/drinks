import { transformUrl } from 'unpic';
import type { Drink, EnhancedDrink } from '#/app/types';

// Transparent 1x1 pixel GIF as fallback when blur placeholder generation fails
const FALLBACK_BLUR_DATA_URL =
  'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

/**
 * Generate a blur placeholder data URL for an image.
 * Uses unpic to transform the URL for supported CDN providers (ImageKit, Contentful, etc.).
 * Falls back to a transparent pixel for unrecognized URLs (e.g., placeholder.com in tests).
 */
async function generateBlurDataUrl(imageUrl: string): Promise<string> {
  // unpic transforms URLs for recognized CDN providers
  const blurredImageUrl = transformUrl({
    url: imageUrl,
    width: 10,
    quality: 90,
    format: 'webp',
  });

  // If unpic doesn't recognize the URL (returns undefined), use fallback
  if (!blurredImageUrl) {
    return FALLBACK_BLUR_DATA_URL;
  }

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

export async function withPlaceholderImages(drinks: Drink[]): Promise<EnhancedDrink[]> {
  return (
    await Promise.all(
      drinks.map(async (drink) => {
        if (
          drink.title === null ||
          drink.ingredients === null ||
          drink.calories === null ||
          !drink.image?.url
        ) {
          return null;
        }

        const blurDataUrl = await generateBlurDataUrl(drink.image.url);

        return {
          ...drink,
          image: {
            ...drink.image,
            blurDataUrl,
          },
        };
      }),
    )
  ).filter((drink): drink is EnhancedDrink => drink !== null);
}
