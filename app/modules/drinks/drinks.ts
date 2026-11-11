export * from "./drinks-contract.ts";

import { randomUUID } from "node:crypto";

import type { getDb } from "#/app/db/client.ts";
import { drinks } from "#/app/db/schema.ts";
import { markdownToHtml } from "./drinks-markdown.ts";
import { withPlaceholderImages } from "./drinks-images.ts";
import { toDrink } from "./drinks-rows.ts";
import { purgeSearchCache, searchDrinks } from "./drinks-search.ts";
import { toDrinkTagViews } from "./drinks-tags.ts";

export { purgeSearchCache };

import type {
  AdminDrinksWriteService,
  DrinkDraft,
  DrinkEditor,
  DrinksService,
  DrinkTagView,
  DrinkWriteNoticeCode,
} from "./drinks-contract.ts";

type Db = ReturnType<typeof getDb>;

type StoredDrinkDraft = DrinkDraft & { imageUrl: string; imageFileId: string };

type AffectedDrinkPages = {
  drinkSlugs: string[];
  tagSlugs: string[];
};

type DrinksWriteEffects = {
  uploadImage: (file: Buffer, fileName: string) => Promise<{ url: string; fileId: string }>;
  deleteImage: (fileId: string) => Promise<void>;
  purgeDrinkCache: (affectedPages: AffectedDrinkPages) => Promise<void>;
};

export const newDrinkEditor: DrinkEditor = {
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

export function createDrinksService(deps: { db: Db }): DrinksService {
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
      ).map(toDrink);

      return withPlaceholderImages(publishedDrinks);
    },
    async getAllDrinks() {
      const adminDrinks = (
        await deps.db.findMany(drinks, {
          orderBy: [
            ["rank", "desc"],
            ["created_at", "desc"],
          ],
        })
      ).map(toDrink);

      return adminDrinks.map((drink) => ({
        id: drink.id,
        title: drink.title,
        slug: drink.slug,
        imageUrl: drink.imageUrl,
        calories: drink.calories,
        rank: drink.rank,
        status: drink.status,
        createdAt: drink.createdAt,
        updatedAt: drink.updatedAt,
      }));
    },
    async getAllTags() {
      const publishedDrinks = (
        await deps.db.findMany(drinks, { where: { status: "published" } })
      ).map(toDrink);

      return toDrinkTagViews(publishedDrinks.flatMap((drink) => drink.tags)).toSorted(
        (left, right) => left.displayName.localeCompare(right.displayName),
      );
    },
    async getDrinkBySlug({ slug, viewerRole }) {
      const drink = await findDrinkBySlug(deps.db, slug);

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
      ).map(toDrink);

      let resolvedTag: DrinkTagView | null = null;
      const matchingDrinks: typeof publishedDrinks = [];

      for (const drink of publishedDrinks) {
        const matchingTag = toDrinkTagViews(drink.tags).find((tag) => tag.slug === tagSlug);

        if (!matchingTag) {
          continue;
        }

        resolvedTag ??= matchingTag;
        matchingDrinks.push(drink);
      }

      if (!resolvedTag || matchingDrinks.length === 0) {
        return null;
      }

      return {
        tag: resolvedTag,
        drinks: await withPlaceholderImages(matchingDrinks),
      };
    },
    async searchPublishedDrinks({ query, preferExactTitle = false }) {
      if (!query) {
        return [];
      }

      const matchingDrinks = await searchDrinks(deps.db, query);

      const exactTitleMatch = preferExactTitle
        ? matchingDrinks.find((drink) => drink.title.toLowerCase() === query.trim().toLowerCase())
        : undefined;

      return withPlaceholderImages(exactTitleMatch ? [exactTitleMatch] : matchingDrinks);
    },
    async findDrinkEditorBySlug(slug) {
      const drink = await findDrinkBySlug(deps.db, slug);

      if (!drink) {
        return null;
      }

      return {
        mode: "edit",
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

export function createAdminDrinksWriteService({
  db,
  writeEffects,
}: {
  db: Db;
  writeEffects: DrinksWriteEffects;
}): AdminDrinksWriteService {
  return {
    async create({ draft, imageBuffer }) {
      const slugAvailability = await checkSlugAvailability(db, draft.slug);

      if (!slugAvailability.available) {
        return { kind: "slugTaken" };
      }

      const uploadedImage = await writeEffects.uploadImage(imageBuffer, `${draft.slug}.jpg`);

      const createdDrink = await insertDrinkRow(db, {
        ...draft,
        imageUrl: uploadedImage.url,
        imageFileId: uploadedImage.fileId,
      }).catch(async (cause: unknown) => {
        await compensateUploadedImage(writeEffects, uploadedImage.fileId);
        throw cause;
      });

      purgeSearchCache();

      const notices = await refreshDrinkCache(writeEffects, {
        drinkSlugs: [createdDrink.slug],
        tagSlugs: toDrinkTagViews(createdDrink.tags).map((tag) => tag.slug),
      });

      return {
        kind: "success",
        notices,
      };
    },
    async update({ slug, draft, imageBuffer }) {
      const existingDrink = await findDrinkBySlug(db, slug);

      if (!existingDrink) {
        return { kind: "notFound" };
      }

      const slugAvailability = await checkSlugAvailability(db, draft.slug, existingDrink.id);

      if (!slugAvailability.available) {
        return { kind: "slugTaken" };
      }

      const uploadedImage = imageBuffer
        ? await writeEffects.uploadImage(imageBuffer, `${draft.slug}.jpg`)
        : undefined;

      const updatedDrink = await updateDrinkRow(db, existingDrink.id, {
        ...draft,
        imageUrl: uploadedImage?.url ?? existingDrink.imageUrl,
        imageFileId: uploadedImage?.fileId ?? existingDrink.imageFileId,
      }).catch(async (cause: unknown) => {
        if (uploadedImage) await compensateUploadedImage(writeEffects, uploadedImage.fileId);
        throw cause;
      });

      purgeSearchCache();

      const notices = uploadedImage
        ? await retireDrinkImage(writeEffects, existingDrink.imageFileId)
        : [];

      notices.push(
        ...(await refreshDrinkCache(writeEffects, {
          drinkSlugs: [...new Set([existingDrink.slug, updatedDrink.slug])],
          tagSlugs: toDrinkTagViews([...existingDrink.tags, ...updatedDrink.tags]).map(
            (tag) => tag.slug,
          ),
        })),
      );

      return {
        kind: "success",
        notices,
      };
    },
    async delete({ slug }) {
      const existingDrink = await findDrinkBySlug(db, slug);

      if (!existingDrink) {
        return { kind: "notFound" };
      }

      await db.delete(drinks, existingDrink.id);

      purgeSearchCache();
      const notices = await retireDrinkImage(writeEffects, existingDrink.imageFileId);
      notices.push(
        ...(await refreshDrinkCache(writeEffects, {
          drinkSlugs: [existingDrink.slug],
          tagSlugs: toDrinkTagViews(existingDrink.tags).map((tag) => tag.slug),
        })),
      );

      return { kind: "success", notices };
    },
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
): Promise<DrinkWriteNoticeCode[]> {
  try {
    await writeEffects.deleteImage(fileId);

    return [];
  } catch (error) {
    console.error("Failed to clean up old image after committed write:", { fileId }, error);

    return ["oldImageCleanupFailed"];
  }
}

async function refreshDrinkCache(
  writeEffects: Pick<DrinksWriteEffects, "purgeDrinkCache">,
  affectedPages: AffectedDrinkPages,
): Promise<DrinkWriteNoticeCode[]> {
  try {
    await writeEffects.purgeDrinkCache(affectedPages);

    return [];
  } catch (error) {
    console.error("Failed to refresh cache after committed write:", affectedPages, error);

    return ["cacheRefreshFailed"];
  }
}

async function checkSlugAvailability(
  db: ReturnType<typeof getDb>,
  slug: string,
  currentDrinkId?: string,
): Promise<{ available: true } | { available: false }> {
  const existingDrink = await db.query(drinks).where({ slug }).select("id").first();

  return !existingDrink || existingDrink.id === currentDrinkId
    ? { available: true }
    : { available: false };
}

async function findDrinkBySlug(db: Db, slug: string) {
  const row = await db.findOne(drinks, { where: { slug } });

  return row ? toDrink(row) : null;
}

async function insertDrinkRow(db: ReturnType<typeof getDb>, draft: StoredDrinkDraft) {
  return toDrink(
    await db.create(drinks, { id: randomUUID(), ...toDrinkColumns(draft) }, { returnRow: true }),
  );
}

async function updateDrinkRow(
  db: ReturnType<typeof getDb>,
  drinkId: string,
  draft: StoredDrinkDraft,
) {
  return toDrink(
    await db.update(drinks, drinkId, {
      ...toDrinkColumns(draft),
      updated_at: Math.floor(Date.now() / 1000),
    }),
  );
}

function toDrinkColumns(draft: StoredDrinkDraft) {
  return {
    slug: draft.slug,
    title: draft.title,
    image_url: draft.imageUrl,
    image_file_id: draft.imageFileId,
    calories: draft.calories,
    ingredients: JSON.stringify(draft.ingredients),
    tags: JSON.stringify(draft.tags),
    notes: draft.notes,
    rank: draft.rank,
    status: draft.status,
  };
}
