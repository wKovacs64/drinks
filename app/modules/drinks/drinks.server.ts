import { createId } from "@paralleldrive/cuid2";
import { desc, eq } from "drizzle-orm";
import { lowerCase } from "lodash-es";
import { FieldDomainError } from "#/app/core/errors";
import type { getDb } from "#/app/db/client.server";
import { drinks, type Drink } from "#/app/db/schema";
import { markdownToHtml } from "./drinks-markdown.server";
import { withPlaceholderImages } from "./drinks-images.server";
import { purgeSearchCache, searchDrinks } from "./drinks-search.server";

export { purgeSearchCache };
import {
  SaveDrinkNoticeCodes,
  type AdminDrinksWriteService,
  type CreateAdminDrinkCommand,
  type DeleteAdminDrinkCommand,
  type DeleteAdminDrinkResult,
  type DrinkDraft,
  type DrinksService,
  type SaveDrinkNotice,
  type UpdateAdminDrinkCommand,
  type UpdateAdminDrinkResult,
} from "./drinks";

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

export class DrinkEditorNotFoundError extends Error {
  constructor(slug: Drink["slug"]) {
    super(`Drink not found for slug "${slug}"`);
    this.name = "DrinkEditorNotFoundError";
  }
}

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
      const publishedDrinks = await deps.db.query.drinks.findMany({
        where: eq(drinks.status, "published"),
        orderBy: [desc(drinks.rank), desc(drinks.createdAt)],
      });

      return withPlaceholderImages(publishedDrinks);
    },
    async getAllDrinks() {
      return deps.db.query.drinks.findMany({
        columns: {
          id: true,
          title: true,
          slug: true,
          imageUrl: true,
          calories: true,
          rank: true,
          status: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: [desc(drinks.rank), desc(drinks.createdAt)],
      });
    },
    async getAllTags() {
      const publishedTags = await deps.db.query.drinks.findMany({
        where: eq(drinks.status, "published"),
        columns: { tags: true },
      });
      return Array.from(new Set(publishedTags.flatMap((drink) => drink.tags))).sort();
    },
    async getDrinkBySlug({ slug, viewerRole }) {
      const drink = await deps.db.query.drinks.findFirst({
        where: eq(drinks.slug, slug),
      });

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
    async getDrinksByTag(tag) {
      const normalizedTag = lowerCase(tag);
      const publishedDrinks = await deps.db.query.drinks.findMany({
        where: eq(drinks.status, "published"),
        orderBy: [desc(drinks.rank), desc(drinks.createdAt)],
      });
      const matchingDrinks = publishedDrinks.filter((drink) => drink.tags.includes(normalizedTag));

      return matchingDrinks.length === 0 ? null : withPlaceholderImages(matchingDrinks);
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
    async getDrinkEditorBySlug(slug) {
      const drink = await deps.db.query.drinks.findFirst({
        where: eq(drinks.slug, slug),
      });

      if (!drink) {
        throw new DrinkEditorNotFoundError(slug);
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
  const existingDrink = await db.query.drinks.findFirst({
    where: eq(drinks.slug, slug),
  });

  if (!existingDrink) {
    return { kind: "notFound", slug };
  }

  await writeEffects.deleteImage(existingDrink.imageFileId);

  await db.delete(drinks).where(eq(drinks.id, existingDrink.id));

  purgeSearchCache();
  await writeEffects.purgeDrinkCache({
    slugs: [existingDrink.slug],
    tags: existingDrink.tags,
  });

  return { kind: "success" };
}

async function updateAdminDrink(
  db: Db,
  writeEffects: DrinksWriteEffects,
  { slug, draft, imageBuffer }: UpdateAdminDrinkCommand,
): Promise<UpdateAdminDrinkResult> {
  const existingDrink = await db.query.drinks.findFirst({
    where: eq(drinks.slug, slug),
  });

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

  let imageUrl = existingDrink.imageUrl;
  let imageFileId = existingDrink.imageFileId;
  const notices: SaveDrinkNotice[] = [];

  if (imageBuffer) {
    const uploadedImage = await writeEffects.uploadImage(imageBuffer, `${draft.slug}.jpg`);
    imageUrl = uploadedImage.url;
    imageFileId = uploadedImage.fileId;

    try {
      await writeEffects.deleteImage(existingDrink.imageFileId);
    } catch (error) {
      notices.push({
        code: SaveDrinkNoticeCodes.oldImageCleanupFailed,
        message: error instanceof Error ? error.message : "Unknown image cleanup failure",
      });
    }
  }

  const updatedDrink = await updateDrinkRow(db, existingDrink.id, {
    ...draft,
    imageUrl,
    imageFileId,
  });

  purgeSearchCache();
  await writeEffects.purgeDrinkCache({
    slugs: [...new Set([existingDrink.slug, updatedDrink.slug])],
    tags: [...new Set([...existingDrink.tags, ...updatedDrink.tags])],
  });

  return {
    kind: "success",
    drinkSlug: updatedDrink.slug,
    notices,
  };
}

async function createAdminDrink(
  db: Db,
  writeEffects: Pick<DrinksWriteEffects, "uploadImage" | "purgeDrinkCache">,
  { draft, imageBuffer }: CreateAdminDrinkCommand,
) {
  if (!imageBuffer) {
    throw new Error("Image buffer is required when creating a drink");
  }

  await ensureSlugAvailable(db, draft.slug);

  const uploadedImage = await writeEffects.uploadImage(imageBuffer, `${draft.slug}.jpg`);

  const createdDrink = await insertDrinkRow(db, {
    ...draft,
    imageUrl: uploadedImage.url,
    imageFileId: uploadedImage.fileId,
  });

  purgeSearchCache();
  await writeEffects.purgeDrinkCache({
    slugs: [createdDrink.slug],
    tags: createdDrink.tags,
  });

  return {
    drinkSlug: createdDrink.slug,
    notices: [],
  };
}

async function ensureSlugAvailable(
  db: ReturnType<typeof getDb>,
  slug: string,
  currentDrinkId?: string,
): Promise<void> {
  const slugAvailability = await checkSlugAvailability(db, slug, currentDrinkId);

  if (!slugAvailability.available) {
    throw new FieldDomainError("slug", "Slug already exists");
  }
}

async function checkSlugAvailability(
  db: ReturnType<typeof getDb>,
  slug: string,
  currentDrinkId?: string,
): Promise<{ available: true } | { available: false }> {
  const existingDrink = await db.query.drinks.findFirst({
    where: eq(drinks.slug, slug),
  });

  return !existingDrink || existingDrink.id === currentDrinkId
    ? { available: true }
    : { available: false };
}

async function insertDrinkRow(
  db: ReturnType<typeof getDb>,
  draft: DrinkDraft & { imageUrl: string; imageFileId: string },
) {
  const [createdDrink] = await db
    .insert(drinks)
    .values({
      id: createId(),
      ...draft,
    })
    .returning();

  return createdDrink;
}

async function updateDrinkRow(
  db: ReturnType<typeof getDb>,
  drinkId: string,
  draft: DrinkDraft & { imageUrl: string; imageFileId: string },
) {
  const [updatedDrink] = await db
    .update(drinks)
    .set({
      ...draft,
      updatedAt: new Date(),
    })
    .where(eq(drinks.id, drinkId))
    .returning();

  return updatedDrink;
}
