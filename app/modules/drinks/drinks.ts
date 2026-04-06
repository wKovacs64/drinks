import { z } from "zod";
import { drinkDraftSchema, drinkStatusValues } from "./drinks-schemas";

export type DrinkStatus = (typeof drinkStatusValues)[number];

/**
 * Drink read model for gallery UI (image placeholders, note text as shown).
 * Used for published-only lists/search/tags and for slug detail — including
 * unpublished rows when {@link DrinkForViewer.visibility} is `"private"`.
 */
export type DrinkView = {
  title: string;
  slug: string;
  image: { url: string; blurDataUrl: string };
  ingredients: string[];
  calories: number;
  notes: string | null;
  tags: string[];
};

export { drinkDraftSchema, drinkStatusValues };

export type DrinkDraft = z.infer<typeof drinkDraftSchema>;

export type DrinkEditor = {
  mode: "create" | "edit";
  drinkSlug?: string;
  imageUrl?: string;
  initialValues: {
    title: string;
    slug: string;
    ingredients: string;
    calories: string;
    tags: string;
    notes: string;
    rank: string;
    status: DrinkStatus;
  };
};

export const SaveDrinkNoticeCodes = {
  oldImageCleanupFailed: "oldImageCleanupFailed",
} as const;

export type SaveDrinkNoticeCode = (typeof SaveDrinkNoticeCodes)[keyof typeof SaveDrinkNoticeCodes];

export type SaveDrinkNotice = {
  code: SaveDrinkNoticeCode;
  message: string;
};

export type SaveDrinkResult = {
  drinkSlug: string;
  notices: SaveDrinkNotice[];
};

export type ViewerRole = "user" | "admin";

export type DrinkForViewer = {
  visibility: "public" | "private";
  drink: DrinkView;
};

export type AdminDrinkListItem = {
  id: string;
  title: string;
  slug: string;
  imageUrl: string;
  calories: number;
  rank: number;
  status: DrinkStatus;
  createdAt: Date;
  updatedAt: Date;
};

export const drinksServiceMutationKeys = ["createDrink", "updateDrink", "deleteDrink"] as const;

export type DrinksServiceMutationKey = (typeof drinksServiceMutationKeys)[number];

/** One drinks module service; mutations omitted when the factory is built without `writeEffects`. */
export interface DrinksService {
  getPublishedDrinks(): Promise<DrinkView[]>;
  getAllDrinks(): Promise<AdminDrinkListItem[]>;
  getDrinkBySlug(input: { slug: string; viewerRole: ViewerRole }): Promise<DrinkForViewer | null>;
  getDrinksByTag(tag: string): Promise<DrinkView[] | null>;
  getAllTags(): Promise<string[]>;
  searchPublishedDrinks(input: { query: string }): Promise<DrinkView[]>;
  getNewDrinkEditor(): Promise<DrinkEditor>;
  getDrinkEditorBySlug(slug: string): Promise<DrinkEditor>;
  createDrink(input: { draft: DrinkDraft; imageBuffer: Buffer }): Promise<SaveDrinkResult>;
  updateDrink(input: {
    slug: string;
    draft: DrinkDraft;
    imageBuffer?: Buffer;
  }): Promise<SaveDrinkResult>;
  deleteDrink(input: { slug: string }): Promise<void>;
}

export type DrinksServiceWithoutMutations = Omit<DrinksService, DrinksServiceMutationKey>;
