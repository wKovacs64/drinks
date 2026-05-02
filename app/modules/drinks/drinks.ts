import { z } from "zod";
import { drinkDraftSchema, drinkStatusValues } from "./drinks-schemas";

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

type SaveDrinkResult = {
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

export type CreateAdminDrinkCommand = {
  draft: DrinkDraft;
  imageBuffer: Buffer;
};

export type UpdateAdminDrinkCommand = {
  slug: string;
  draft: DrinkDraft;
  imageBuffer?: Buffer;
};

export type DeleteAdminDrinkCommand = {
  slug: string;
};

export type AdminDrinkWriteSuccessResult = SaveDrinkResult & {
  kind: "success";
};

export type AdminDrinkWriteFieldErrorResult = {
  kind: "fieldError";
  fieldErrors: Record<string, string[] | undefined>;
  formErrors: string[];
};

export type AdminDrinkWriteNotFoundResult = {
  kind: "notFound";
  slug: string;
};

export type UpdateAdminDrinkResult =
  | AdminDrinkWriteSuccessResult
  | AdminDrinkWriteFieldErrorResult
  | AdminDrinkWriteNotFoundResult;

export type DeleteAdminDrinkSuccessResult = {
  kind: "success";
};

export type DeleteAdminDrinkResult = DeleteAdminDrinkSuccessResult | AdminDrinkWriteNotFoundResult;

export type CreateAdminDrinkResult = AdminDrinkWriteSuccessResult | AdminDrinkWriteFieldErrorResult;

export interface AdminDrinksWriteService {
  create(command: CreateAdminDrinkCommand): Promise<CreateAdminDrinkResult>;
  update(command: UpdateAdminDrinkCommand): Promise<UpdateAdminDrinkResult>;
  delete(command: DeleteAdminDrinkCommand): Promise<DeleteAdminDrinkResult>;
}

export type DrinksByTagSlug = {
  tag: DrinkTagView;
  drinks: DrinkView[];
};

export interface DrinksService {
  getPublishedDrinks(): Promise<DrinkView[]>;
  getAllDrinks(): Promise<AdminDrinkListItem[]>;
  getDrinkBySlug(input: { slug: string; viewerRole: ViewerRole }): Promise<DrinkForViewer | null>;
  getDrinksByTagSlug(input: { tagSlug: string }): Promise<DrinksByTagSlug | null>;
  getAllTags(): Promise<DrinkTagView[]>;
  searchPublishedDrinks(input: { query: string }): Promise<DrinkView[]>;
  getNewDrinkEditor(): Promise<DrinkEditor>;
  findDrinkEditorBySlug(slug: string): Promise<DrinkEditor | null>;
}
