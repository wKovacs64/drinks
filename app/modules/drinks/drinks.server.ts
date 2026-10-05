import { randomUUID } from "node:crypto";

import type { getDb } from "#/app/db/client.server.ts";
import { drinks, readDrink, writeDrink } from "#/app/db/schema.ts";
import { markdownToHtml } from "./drinks-markdown.server.ts";
import { withPlaceholderImages } from "./drinks-images.server.ts";
import { purgeSearchCache, searchDrinks } from "./drinks-search.server.ts";
import { toDrinkTagViews } from "./drinks-tags.server.ts";

export { purgeSearchCache };
import {
  DrinkWriteNoticeCodes,
  type AdminDrinksWriteService,
  type CreateAdminDrinkCommand,
  type DeleteAdminDrinkCommand,
  type DeleteAdminDrinkResult,
  type DrinkDraft,
  type DrinksService,
  type DrinkTagView,
  type DrinkWriteNotice,
  type UpdateAdminDrinkCommand,
  type UpdateAdminDrinkResult,
} from "./drinks.ts";

type Db = ReturnType<typeof getDb>;

type AffectedDrinkPages = {
  slugs: string[];
  tags: string[];
};

type DrinksWriteEffects = {
  uploadImage: (file: Buffer, fileName: string) => Promise<{ url: string; fileId: string }>;
  deleteImage: (fileId: string) => Promise<void>;
  purgeDrinkCache: (affectedPages: AffectedDrinkPages) => Promise<void>;
};

export function createDrinksService(deps: { db: Db }): DrinksService {
  return buildDrinksServiceReadMethods({ db: deps.db });
}

export function createAdminDrinksWriteService(deps: {
  db: Db;
  writeEffects: DrinksWriteEffects;
}): AdminDrinksWriteService {
  return {
    async create(command) {
      return createAdminDrink(deps.db, deps.writeEffects, command);
    },
    async update(command) {
      return updateAdminDrink(deps.db, deps.writeEffects, command);
    },
    async delete(command) {
      return deleteAdminDrink(deps.db, deps.writeEffects, command);
    },
  };
}

function buildDrinksServiceReadMethods(deps: { db: Db }): DrinksService {
  return {
    async getPublishedDrinks() {
      const publishedDrinks = (
        await deps.db.findMany(drinks, {
          where: { status: "published" },
          orderBy: [
            ["rank", "desc"],
            ["created_at", "desc"],
          ],
        })
      ).map(readDrink);

      return withPlaceholderImages(publishedDrinks);
    },
    async getAllDrinks() {
      return (
        await deps.db.findMany(drinks, {
          orderBy: [
            ["rank", "desc"],
            ["created_at", "desc"],
          ],
        })
      ).map(readDrink);
    },
    async getAllTags() {
      const publishedTags = (
        await deps.db.findMany(drinks, { where: { status: "published" } })
      ).map(readDrink);
      return toDrinkTagViews(publishedTags.flatMap((drink) => drink.tags)).toSorted((left, right) =>
        left.displayName.localeCompare(right.displayName),
      );
    },
    async getDrinkBySlug({ slug, viewerRole }) {
      const drinkRow = await deps.db.findOne(drinks, { where: { slug } });
      const drink = drinkRow ? readDrink(drinkRow) : null;

      if (!drink) {
        return null;
      }

      if (viewerRole !== "admin" && drink.status !== "published") {
        return null;
      }

      const [enhancedDrink] = await withPlaceholderImages([drink]);
      const renderedNotes = enhancedDrink.notes
        ? markdownToHtml(enhancedDrink.notes)
        : enhancedDrink.notes;

      return {
        visibility: drink.status === "published" ? "public" : "private",
        drink: {
          ...enhancedDrink,
          notes: renderedNotes,
        },
      };
    },
    async getDrinksByTagSlug({ tagSlug }) {
      const publishedDrinks = (
        await deps.db.findMany(drinks, {
          where: { status: "published" },
          orderBy: [
            ["rank", "desc"],
            ["created_at", "desc"],
          ],
        })
      ).map(readDrink);

      let resolvedTag: DrinkTagView | null = null;
      const matchingDrinks = publishedDrinks.filter((drink) => {
        const matchingTag = toDrinkTagViews(drink.tags).find((tag) => tag.slug === tagSlug);

        if (!matchingTag) {
          return false;
        }

        resolvedTag ??= matchingTag;
        return true;
      });

      if (!resolvedTag || matchingDrinks.length === 0) {
        return null;
      }

      return {
        tag: resolvedTag,
        drinks: await withPlaceholderImages(matchingDrinks),
      };
    },
    async searchPublishedDrinks({ query }) {
      if (!query) {
        return [];
      }

      const matchingDrinks = await searchDrinks(deps.db, query);
      return withPlaceholderImages(matchingDrinks);
    },
    async getNewDrinkEditor() {
      return {
        mode: "create",
        initialValues: {
          title: "",
          slug: "",
          ingredients: "",
          calories: "",
          tags: "",
          notes: "",
          rank: "0",
          status: "published",
        },
      };
    },
    async findDrinkEditorBySlug(slug) {
      const drinkRow = await deps.db.findOne(drinks, { where: { slug } });
      const drink = drinkRow ? readDrink(drinkRow) : null;

      if (!drink) {
        return null;
      }

      return {
        mode: "edit",
        drinkSlug: drink.slug,
        imageUrl: drink.imageUrl,
        initialValues: {
          title: drink.title,
          slug: drink.slug,
          ingredients: drink.ingredients.join("\n"),
          calories: String(drink.calories),
          tags: drink.tags.join(", "),
          notes: drink.notes ?? "",
          rank: String(drink.rank),
          status: drink.status,
        },
      };
    },
  };
}

async function deleteAdminDrink(
  db: Db,
  writeEffects: Pick<DrinksWriteEffects, "deleteImage" | "purgeDrinkCache">,
  { slug }: DeleteAdminDrinkCommand,
): Promise<DeleteAdminDrinkResult> {
  const existingRow = await db.findOne(drinks, { where: { slug } });
  const existingDrink = existingRow ? readDrink(existingRow) : null;

  if (!existingDrink) {
    return { kind: "notFound", slug };
  }

  await db.delete(drinks, existingDrink.id);

  purgeSearchCache();
  const notices = await retireDrinkImage(writeEffects, existingDrink.imageFileId);
  notices.push(
    ...(await refreshDrinkCache(writeEffects, {
      slugs: [existingDrink.slug],
      tags: existingDrink.tags,
    })),
  );

  return { kind: "success", notices };
}

async function updateAdminDrink(
  db: Db,
  writeEffects: DrinksWriteEffects,
  { slug, draft, imageBuffer }: UpdateAdminDrinkCommand,
): Promise<UpdateAdminDrinkResult> {
  const existingRow = await db.findOne(drinks, { where: { slug } });
  const existingDrink = existingRow ? readDrink(existingRow) : null;

  if (!existingDrink) {
    return { kind: "notFound", slug };
  }

  const slugAvailability = await checkSlugAvailability(db, draft.slug, existingDrink.id);
  if (!slugAvailability.available) {
    return {
      kind: "fieldError",
      fieldErrors: { slug: ["Slug already exists"] },
      formErrors: [],
    };
  }

  const uploadedImage = imageBuffer
    ? await writeEffects.uploadImage(imageBuffer, `${draft.slug}.jpg`)
    : undefined;
  const updatedDrink = await updateDrinkRow(db, existingDrink.id, {
    ...draft,
    imageUrl: uploadedImage?.url ?? existingDrink.imageUrl,
    imageFileId: uploadedImage?.fileId ?? existingDrink.imageFileId,
  }).catch(async (error: unknown) => {
    if (uploadedImage) await compensateUploadedImage(writeEffects, uploadedImage.fileId);
    throw error;
  });

  purgeSearchCache();
  const notices = uploadedImage
    ? await retireDrinkImage(writeEffects, existingDrink.imageFileId)
    : [];
  notices.push(
    ...(await refreshDrinkCache(writeEffects, {
      slugs: [...new Set([existingDrink.slug, updatedDrink.slug])],
      tags: [...new Set([...existingDrink.tags, ...updatedDrink.tags])],
    })),
  );

  return {
    kind: "success",
    drinkSlug: updatedDrink.slug,
    notices,
  };
}

async function createAdminDrink(
  db: Db,
  writeEffects: DrinksWriteEffects,
  { draft, imageBuffer }: CreateAdminDrinkCommand,
) {
  if (!imageBuffer) {
    throw new Error("Image buffer is required when creating a drink");
  }

  const slugAvailability = await checkSlugAvailability(db, draft.slug);
  if (!slugAvailability.available) {
    return {
      kind: "fieldError" as const,
      fieldErrors: { slug: ["Slug already exists"] },
      formErrors: [],
    };
  }

  const uploadedImage = await writeEffects.uploadImage(imageBuffer, `${draft.slug}.jpg`);

  const createdDrink = await insertDrinkRow(db, {
    ...draft,
    imageUrl: uploadedImage.url,
    imageFileId: uploadedImage.fileId,
  }).catch(async (error: unknown) => {
    await compensateUploadedImage(writeEffects, uploadedImage.fileId);
    throw error;
  });

  purgeSearchCache();
  const notices = await refreshDrinkCache(writeEffects, {
    slugs: [createdDrink.slug],
    tags: createdDrink.tags,
  });

  return {
    kind: "success" as const,
    drinkSlug: createdDrink.slug,
    notices,
  };
}

async function compensateUploadedImage(
  writeEffects: Pick<DrinksWriteEffects, "deleteImage">,
  fileId: string,
): Promise<void> {
  try {
    await writeEffects.deleteImage(fileId);
  } catch (error) {
    console.error("Failed to clean up uploaded image after persistence failure:", error);
  }
}

async function retireDrinkImage(
  writeEffects: Pick<DrinksWriteEffects, "deleteImage">,
  fileId: string,
): Promise<DrinkWriteNotice[]> {
  try {
    await writeEffects.deleteImage(fileId);
    return [];
  } catch (error) {
    return [
      {
        code: DrinkWriteNoticeCodes.oldImageCleanupFailed,
        message: error instanceof Error ? error.message : "Unknown image cleanup failure",
      },
    ];
  }
}

async function refreshDrinkCache(
  writeEffects: Pick<DrinksWriteEffects, "purgeDrinkCache">,
  affectedPages: AffectedDrinkPages,
): Promise<DrinkWriteNotice[]> {
  try {
    await writeEffects.purgeDrinkCache(affectedPages);
    return [];
  } catch (error) {
    return [
      {
        code: DrinkWriteNoticeCodes.cacheRefreshFailed,
        message: error instanceof Error ? error.message : "Unknown cache refresh failure",
      },
    ];
  }
}

async function checkSlugAvailability(
  db: ReturnType<typeof getDb>,
  slug: string,
  currentDrinkId?: string,
): Promise<{ available: true } | { available: false }> {
  const existingRow = await db.findOne(drinks, { where: { slug } });
  const existingDrink = existingRow ? readDrink(existingRow) : null;

  return !existingDrink || existingDrink.id === currentDrinkId
    ? { available: true }
    : { available: false };
}

async function insertDrinkRow(
  db: ReturnType<typeof getDb>,
  draft: DrinkDraft & { imageUrl: string; imageFileId: string },
) {
  const createdDrink = readDrink(
    await db.create(drinks, writeDrink({ id: randomUUID(), ...draft }), { returnRow: true }),
  );

  return createdDrink;
}

async function updateDrinkRow(
  db: ReturnType<typeof getDb>,
  drinkId: string,
  draft: DrinkDraft & { imageUrl: string; imageFileId: string },
) {
  const existingRow = await db.find(drinks, drinkId);
  if (!existingRow) throw new Error("Drink not found");
  const updatedDrink = readDrink(
    await db.update(
      drinks,
      drinkId,
      writeDrink({
        ...readDrink(existingRow),
        ...draft,
        updatedAt: new Date(),
      }),
    ),
  );

  return updatedDrink;
}
