import type { z } from "zod";
import type { Drink } from "#/app/db";
import {
  createDrink as insertDrink,
  updateDrink as patchDrink,
  deleteDrink as removeDrink,
} from "./queries.server";
import { uploadImage, deleteImage } from "./imagekit.server";
import { purgeDrinkCache } from "./fastly.server";
import type { drinkFormSchema } from "./validation";

type DrinkFormData = z.infer<typeof drinkFormSchema>;

type ImageUpload = {
  buffer: Buffer;
};

export type UpdateDrinkResult = {
  drink: Drink;
  staleImageError?: string;
};

export async function createDrink(data: DrinkFormData, imageUpload: ImageUpload): Promise<Drink> {
  const { url: imageUrl, fileId: imageFileId } = await uploadImage(
    imageUpload.buffer,
    `${data.slug}.jpg`,
  );

  const drink = await insertDrink({
    ...data,
    imageUrl,
    imageFileId,
  });

  try {
    await purgeDrinkCache({ slug: drink.slug, tags: drink.tags });
  } catch (error) {
    console.error("Cache invalidation failed:", error);
  }

  return drink;
}

export async function updateDrink(
  existingDrink: Drink,
  data: DrinkFormData,
  imageUpload?: ImageUpload,
): Promise<UpdateDrinkResult> {
  let imageUrl: string;
  let imageFileId: string;
  let staleImageError: string | undefined;

  if (imageUpload) {
    const result = await uploadImage(imageUpload.buffer, `${data.slug}.jpg`);
    imageUrl = result.url;
    imageFileId = result.fileId;

    if (existingDrink.imageFileId) {
      try {
        await deleteImage(existingDrink.imageFileId);
      } catch (error) {
        staleImageError =
          error instanceof Error ? error.message : "Unknown error deleting old image";
      }
    }
  } else {
    imageUrl = existingDrink.imageUrl;
    imageFileId = existingDrink.imageFileId;
  }

  const drink = await patchDrink(existingDrink.id, {
    ...data,
    imageUrl,
    imageFileId,
  });

  try {
    const allTags = [...new Set([...existingDrink.tags, ...data.tags])];
    await purgeDrinkCache({ slug: data.slug, tags: allTags });
    if (existingDrink.slug !== data.slug) {
      await purgeDrinkCache({ slug: existingDrink.slug, tags: [] });
    }
  } catch (error) {
    console.error("Cache invalidation failed:", error);
  }

  return { drink, staleImageError };
}

export async function deleteDrink(existingDrink: Drink): Promise<void> {
  if (existingDrink.imageFileId) {
    await deleteImage(existingDrink.imageFileId);
  }

  await removeDrink(existingDrink.id);

  try {
    await purgeDrinkCache({ slug: existingDrink.slug, tags: existingDrink.tags });
  } catch (error) {
    console.error("Cache invalidation failed:", error);
  }
}
