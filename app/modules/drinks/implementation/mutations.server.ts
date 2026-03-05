import type { z } from "zod";
import type { Drink } from "#/app/db/schema";
import { purgeSearchCache } from "#/app/modules/search";
import {
  createDrink as insertDrink,
  updateDrink as patchDrink,
  deleteDrink as removeDrink,
} from "./queries.server";
import { uploadImageOrPlaceholder, deleteImage } from "./imagekit.server";
import { purgeDrinkCache } from "./fastly.server";
import type { drinkFormSchema } from "./validation";

type DrinkFormData = z.infer<typeof drinkFormSchema>;

type ImageUpload = {
  buffer: Buffer;
  contentType: string;
};

export async function createDrink(data: DrinkFormData, imageUpload: ImageUpload): Promise<Drink> {
  const { url: imageUrl, fileId: imageFileId } = await uploadImageOrPlaceholder(
    imageUpload.buffer,
    `${data.slug}.jpg`,
  );

  const drink = await insertDrink({
    ...data,
    imageUrl,
    imageFileId,
  });

  try {
    purgeSearchCache();
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
  keepExistingImage?: boolean,
): Promise<Drink> {
  let imageUrl: string;
  let imageFileId: string;

  if (imageUpload) {
    const result = await uploadImageOrPlaceholder(imageUpload.buffer, `${data.slug}.jpg`);
    imageUrl = result.url;
    imageFileId = result.fileId;

    if (existingDrink.imageFileId && existingDrink.imageFileId !== "test-placeholder") {
      try {
        await deleteImage(existingDrink.imageFileId);
      } catch (error) {
        console.error("Failed to delete old image:", error);
      }
    }
  } else if (keepExistingImage) {
    imageUrl = existingDrink.imageUrl;
    imageFileId = existingDrink.imageFileId;
  } else {
    imageUrl = `https://via.placeholder.com/400x400.png?text=${encodeURIComponent(data.slug)}`;
    imageFileId = "test-placeholder";
  }

  const drink = await patchDrink(existingDrink.id, {
    ...data,
    imageUrl,
    imageFileId,
  });

  try {
    purgeSearchCache();
    const allTags = [...new Set([...existingDrink.tags, ...data.tags])];
    await purgeDrinkCache({ slug: data.slug, tags: allTags });
    if (existingDrink.slug !== data.slug) {
      await purgeDrinkCache({ slug: existingDrink.slug, tags: [] });
    }
  } catch (error) {
    console.error("Cache invalidation failed:", error);
  }

  return drink;
}

export async function deleteDrink(existingDrink: Drink): Promise<void> {
  if (existingDrink.imageFileId && existingDrink.imageFileId !== "test-placeholder") {
    try {
      await deleteImage(existingDrink.imageFileId);
    } catch (error) {
      console.error("Failed to delete drink image:", error);
    }
  }

  await removeDrink(existingDrink.id);

  try {
    purgeSearchCache();
    await purgeDrinkCache({ slug: existingDrink.slug, tags: existingDrink.tags });
  } catch (error) {
    console.error("Cache invalidation failed:", error);
  }
}
