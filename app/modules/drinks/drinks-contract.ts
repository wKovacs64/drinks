import type { InferOutput } from "remix/data-schema";
import { drinkDraftSchema, drinkStatusValues } from "./drinks-schemas.ts";

export type DrinkStatus = (typeof drinkStatusValues)[number];

export type DrinkTagView = {
  displayName: string;
  slug: string;
};

/** Drink summary: a Published drink as shown in gallery lists, Search results, and Tag pages. */
export type DrinkSummaryView = {
  title: string;
  slug: string;
  image: { url: string; blurDataUrl: string };
  ingredients: string[];
  calories: number;
};

/**
 * Drink view: the slug page presentation, including unpublished Drinks when
 * {@link DrinkForViewer.visibility} is `"private"`. `notesHtml` is the stored notes markdown
 * rendered to allowlisted HTML; no other read model carries notes.
 */
export type DrinkView = DrinkSummaryView & {
  notesHtml: string | null;
  tags: DrinkTagView[];
};

export { drinkDraftSchema, drinkStatusValues };

export type DrinkDraft = InferOutput<typeof drinkDraftSchema>;

/** The Drink editor's form fields. */
export const drinkEditorFieldNames = [
  "title",
  "slug",
  "ingredients",
  "calories",
  "tags",
  "notes",
  "rank",
  "status",
] as const;

/** Editor values are form text, except `status`, which is always a valid Drink status. */
export type DrinkEditorValues = Record<
  Exclude<(typeof drinkEditorFieldNames)[number], "status">,
  string
> & { status: DrinkStatus };

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
  drinks: DrinkSummaryView[];
};

export interface DrinksService {
  getPublishedDrinks: () => Promise<DrinkSummaryView[]>;
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
  }) => Promise<DrinkSummaryView[]>;
  findDrinkEditorBySlug: (slug: string) => Promise<DrinkEditor | null>;
}
