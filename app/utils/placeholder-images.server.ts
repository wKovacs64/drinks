import { makeImageUrl } from '~/components/image';
import type { DrinksCache } from '~/utils/cache.server';
import type { Drink } from '~/types';

export async function withPlaceholderImages(
  drinks: ReadonlyArray<Drink>,
  cache: DrinksCache,
) {
  return Promise.all(
    drinks.map(async (drink) => {
      const cacheKey = drink.image.url;
      let blurDataUrl;

      const cachedBlurDataUrl = await cache.get(cacheKey);

      if (cachedBlurDataUrl) {
        blurDataUrl = cachedBlurDataUrl;
      } else {
        const blurredImageUrl = makeImageUrl({
          baseImageUrl: drink.image.url,
          width: 10,
          quality: 90,
          format: 'webp',
        });
        const blurredImageResponse = await fetch(blurredImageUrl);
        const blurredImageArrayBuffer =
          await blurredImageResponse.arrayBuffer();
        const blurredImageBase64String = btoa(
          String.fromCharCode(...new Uint8Array(blurredImageArrayBuffer)),
        );
        blurDataUrl = `data:image/webp;base64,${blurredImageBase64String}`;
        await cache.put(cacheKey, blurDataUrl);
      }

      return {
        ...drink,
        image: {
          ...drink.image,
          blurDataUrl,
        },
      };
    }),
  );
}
