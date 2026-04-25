import { href } from "react-router";
import { DomainError, FieldDomainError } from "#/app/core/errors";
import { intent, type Intent } from "#/app/core/route-action.server";
import type { getDb } from "#/app/db/client.server";
import { drinkDraftSchema, SaveDrinkNoticeCodes } from "#/app/modules/drinks/drinks";
import {
  createAdminDrinksWriteService,
  createDrinksService,
} from "#/app/modules/drinks/drinks.server";
import {
  parseCreateDrinkSubmission,
  parseUpdateDrinkSubmission,
} from "./admin-drink-submission.server";

type Db = ReturnType<typeof getDb>;
type UploadImage = (file: Buffer, fileName: string) => Promise<{ url: string; fileId: string }>;
type DeleteImage = (fileId: string) => Promise<void>;
type PurgeDrinkCache = (affectedPages: { slugs: string[]; tags: string[] }) => Promise<void>;

type DrinkWritePreparationInvalidResult = {
  kind: "invalid";
  fieldErrors: Record<string, string[] | undefined>;
  formErrors: string[];
  status: 400;
};

type DrinkWritePreparationReadyResult = {
  kind: "ready";
  formData: FormData;
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
      deleteImage: deps.deleteImage,
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
      const submission = await parseCreateDrinkSubmission(request);
      if (submission.kind === "invalid") {
        return submission;
      }
      if (!submission.imageUpload) {
        throw new Error("Create drink submission parser returned ready without an image upload");
      }
      const imageUpload = submission.imageUpload;

      return {
        kind: "ready",
        formData: submission.formData,
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
      const submission = await parseUpdateDrinkSubmission(request);
      if (submission.kind === "invalid") {
        return submission;
      }

      return {
        kind: "ready",
        formData: submission.formData,
        intent: intent({
          schema: drinkDraftSchema,
          operation: async (draft) => {
            const result = await adminDrinksWriteService.update({
              slug,
              draft,
              imageBuffer: submission.imageUpload?.buffer,
            });

            if (result.kind === "notFound") {
              throw new Response("Drink not found", { status: 404 });
            }

            if (result.kind === "fieldError") {
              const [field, messages] = Object.entries(result.fieldErrors)[0] ?? [];
              throw new FieldDomainError(field ?? "slug", messages?.[0] ?? "Invalid drink");
            }

            return result;
          },
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
