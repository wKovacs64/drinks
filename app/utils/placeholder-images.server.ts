import { transformUrl } from 'unpic';
import type { Drink, EnhancedDrink } from '~/types';

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

        const blurredImageUrl = transformUrl({
          url: drink.image.url,
          width: 10,
          quality: 90,
          format: 'webp',
        });
        if (!blurredImageUrl) {
          return null;
        }
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
    )
  ).filter((drink): drink is EnhancedDrink => drink !== null);
}
