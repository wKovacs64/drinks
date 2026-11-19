import type { InferOutput } from "remix/data-schema";
import { drinkDraftSchema, drinkStatusValues } from "./drinks-schemas.ts";

export type DrinkStatus = (typeof drinkStatusValues)[number];

export type DrinkTagView = {
  displayName: string;
  slug: string;
};

export type DrinkSummaryView = {
  title: string;
  slug: string;
  image: { url: string; blurDataUrl: string };
  ingredients: string[];
  calories: number;
};

export type DrinkView = DrinkSummaryView & {
  notesHtml: string | null;
  tags: DrinkTagView[];
};

export { drinkDraftSchema, drinkStatusValues };

export type DrinkDraft = InferOutput<typeof drinkDraftSchema>;

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

export type DrinkEditorValues = Record<
  Exclude<(typeof drinkEditorFieldNames)[number], "status">,
  string
> & { status: DrinkStatus };

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
    preferExactTitle?: boolean;
  }) => Promise<DrinkSummaryView[]>;
  findDrinkEditorBySlug: (slug: string) => Promise<DrinkEditor | null>;
}
