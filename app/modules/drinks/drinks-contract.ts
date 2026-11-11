import type { InferOutput } from "remix/data-schema";
import { drinkDraftSchema, drinkStatusValues } from "./drinks-schemas.ts";

export type DrinkStatus = (typeof drinkStatusValues)[number];

/**
 * Drink read model for gallery UI (image placeholders, note text as shown).
 * Used for published-only lists/search/tags and for slug detail — including
 * unpublished rows when {@link DrinkForViewer.visibility} is `"private"`.
 */
export type DrinkTagView = {
  displayName: string;
  slug: string;
};

export type DrinkView = {
  title: string;
  slug: string;
  image: { url: string; blurDataUrl: string };
  ingredients: string[];
  calories: number;
  notes: string | null;
  tags: DrinkTagView[];
};

export { drinkDraftSchema, drinkStatusValues };

export type DrinkDraft = InferOutput<typeof drinkDraftSchema>;

type DrinkEditorValues = {
  title: string;
  slug: string;
  ingredients: string;
  calories: string;
  tags: string;
  notes: string;
  rank: string;
  status: DrinkStatus;
};

/** A new Drink has no image until one is uploaded; an existing Drink always has one. */
export type DrinkEditor =
  | { mode: "create"; initialValues: DrinkEditorValues }
  | { mode: "edit"; imageUrl: string; initialValues: DrinkEditorValues };

export type DrinkWriteNoticeCode = "oldImageCleanupFailed" | "cacheRefreshFailed";

type ViewerRole = "user" | "admin";

type DrinkForViewer = {
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

type CreateAdminDrinkCommand = {
  draft: DrinkDraft;
  imageBuffer: Buffer;
};

type UpdateAdminDrinkCommand = {
  slug: string;
  draft: DrinkDraft;
  imageBuffer?: Buffer;
};

type DeleteAdminDrinkCommand = {
  slug: string;
};

type AdminDrinkWriteSuccessResult = {
  kind: "success";
  notices: DrinkWriteNoticeCode[];
};

type AdminDrinkWriteSlugTakenResult = {
  kind: "slugTaken";
};

type AdminDrinkWriteNotFoundResult = {
  kind: "notFound";
};

export type UpdateAdminDrinkResult =
  | AdminDrinkWriteSuccessResult
  | AdminDrinkWriteSlugTakenResult
  | AdminDrinkWriteNotFoundResult;

export type DeleteAdminDrinkResult = AdminDrinkWriteSuccessResult | AdminDrinkWriteNotFoundResult;

export type CreateAdminDrinkResult = AdminDrinkWriteSuccessResult | AdminDrinkWriteSlugTakenResult;

export interface AdminDrinksWriteService {
  create: (command: CreateAdminDrinkCommand) => Promise<CreateAdminDrinkResult>;
  update: (command: UpdateAdminDrinkCommand) => Promise<UpdateAdminDrinkResult>;
  delete: (command: DeleteAdminDrinkCommand) => Promise<DeleteAdminDrinkResult>;
}

export type DrinksByTagSlug = {
  tag: DrinkTagView;
  drinks: DrinkView[];
};

export interface DrinksService {
  getPublishedDrinks: () => Promise<DrinkView[]>;
  getAllDrinks: () => Promise<AdminDrinkListItem[]>;
  getDrinkBySlug: (input: {
    slug: string;
    viewerRole: ViewerRole;
  }) => Promise<DrinkForViewer | null>;
  getDrinksByTagSlug: (input: { tagSlug: string }) => Promise<DrinksByTagSlug | null>;
  getAllTags: () => Promise<DrinkTagView[]>;
  searchPublishedDrinks: (input: {
    query: string;
    /** Return only the exact title match when one exists. */
    preferExactTitle?: boolean;
  }) => Promise<DrinkView[]>;
  findDrinkEditorBySlug: (slug: string) => Promise<DrinkEditor | null>;
}
