import { href } from "react-router";
import { DomainError } from "#/app/core/errors";
import { parseImageUpload } from "#/app/core/image-upload.server";
import { intent, type Intent } from "#/app/core/route-action.server";
import type { getDb } from "#/app/db/client.server";
import { drinkDraftSchema, SaveDrinkNoticeCodes } from "#/app/modules/drinks/drinks";
import {
  createAdminDrinksWriteService,
  createDrinksService,
} from "#/app/modules/drinks/drinks.server";

type Db = ReturnType<typeof getDb>;
type UploadImage = (file: Buffer, fileName: string) => Promise<{ url: string; fileId: string }>;
type DeleteImage = (fileId: string) => Promise<void>;
type PurgeDrinkCache = (drink: { slug: string; tags: string[] }) => Promise<void>;
type ImageUpload = NonNullable<Awaited<ReturnType<typeof parseImageUpload>>["imageUpload"]>;

type DrinkWritePreparationInvalidResult = {
  kind: "invalid";
  fieldErrors: Record<string, string[] | undefined>;
  formErrors: string[];
  status: 400;
};

type DrinkWritePreparationReadyResult = {
  kind: "ready";
  intent: Intent;
};

export type DrinkWritePreparationResult =
  | DrinkWritePreparationReadyResult
  | DrinkWritePreparationInvalidResult;

export type AdminDrinkWriteWorkflow = {
  prepareCreate(input: { request: Request }): Promise<DrinkWritePreparationResult>;
  prepareUpdate(input: { request: Request; slug: string }): Promise<DrinkWritePreparationResult>;
  prepareDelete(input: { slug: string }): Promise<Intent>;
};

export function createAdminDrinkWriteWorkflow(deps: {
  db: Db;
  uploadImage: UploadImage;
  deleteImage: DeleteImage;
  purgeDrinkCache: PurgeDrinkCache;
}): AdminDrinkWriteWorkflow {
  const adminDrinksWriteService = createAdminDrinksWriteService({
    db: deps.db,
    writeEffects: {
      uploadImage: deps.uploadImage,
      purgeDrinkCache: deps.purgeDrinkCache,
    },
  });
  const drinksService = createDrinksService({
    db: deps.db,
    writeEffects: {
      uploadImage: deps.uploadImage,
      deleteImage: deps.deleteImage,
      purgeDrinkCache: deps.purgeDrinkCache,
    },
  });

  return {
    async prepareCreate({ request }) {
      const imagePreparation = await prepareImageUpload(request);
      if (imagePreparation.kind === "invalid") {
        return imagePreparation;
      }

      const imageUpload = imagePreparation.imageUpload;
      if (!imageUpload) {
        return invalidPreparation("Image is required");
      }

      return {
        kind: "ready",
        intent: intent({
          schema: drinkDraftSchema,
          operation: async (draft) =>
            adminDrinksWriteService.create({
              draft,
              imageBuffer: imageUpload.buffer,
            }),
          redirectTo: href("/admin/drinks"),
          toast: {
            successMessage: "Drink created!",
          },
        }),
      };
    },
    async prepareUpdate({ request, slug }) {
      const imagePreparation = await prepareImageUpload(request);
      if (imagePreparation.kind === "invalid") {
        return imagePreparation;
      }

      return {
        kind: "ready",
        intent: intent({
          schema: drinkDraftSchema,
          operation: async (draft) =>
            drinksService.updateDrink({
              slug,
              draft,
              imageBuffer: imagePreparation.imageUpload?.buffer,
            }),
          redirectTo: href("/admin/drinks"),
          toast: (operationResult) => {
            if (operationResult instanceof DomainError) {
              return { kind: "error", message: operationResult.message };
            }
            return operationResult.notices.some(
              (notice) => notice.code === SaveDrinkNoticeCodes.oldImageCleanupFailed,
            )
              ? { kind: "warning", message: "Drink updated, but old image cleanup failed" }
              : { kind: "success", message: "Drink updated!" };
          },
        }),
      };
    },
    async prepareDelete({ slug }) {
      return intent({
        operation: async () => drinksService.deleteDrink({ slug }),
        redirectTo: href("/admin/drinks"),
        toast: {
          successMessage: "Drink deleted!",
        },
      });
    },
  };
}

async function prepareImageUpload(
  request: Request,
): Promise<
  { kind: "ready"; imageUpload: ImageUpload | undefined } | DrinkWritePreparationInvalidResult
> {
  const { imageUpload, imageError } = await parseImageUpload(request.clone());

  if (imageError) {
    return invalidPreparation(imageError);
  }

  return {
    kind: "ready",
    imageUpload,
  };
}

function invalidPreparation(message: string): DrinkWritePreparationInvalidResult {
  return {
    kind: "invalid",
    fieldErrors: {
      imageFile: [message],
    },
    formErrors: [],
    status: 400,
  };
}
