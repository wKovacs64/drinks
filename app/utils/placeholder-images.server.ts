import { makeImageUrl } from '~/core/image';
import type { Drink } from '~/types';

export async function withPlaceholderImages(drinks: Array<Drink>) {
  return Promise.all(
    drinks.map(async (drink) => {
      const blurredImageUrl = makeImageUrl({
        baseImageUrl: drink.image.url,
        width: 10,
        quality: 90,
        format: 'webp',
      });
      const blurredImageResponse = await fetch(blurredImageUrl);
      const blurredImageArrayBuffer = await blurredImageResponse.arrayBuffer();
      const blurredImageBase64String = btoa(
        String.fromCharCode(...new Uint8Array(blurredImageArrayBuffer)),
      );
      const blurDataUrl = `data:image/webp;base64,${blurredImageBase64String}`;

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
