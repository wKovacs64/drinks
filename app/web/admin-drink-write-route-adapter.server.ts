import { data, href } from "react-router";
import { DomainError, FieldDomainError } from "#/app/core/errors";
import { intent, routeAction } from "#/app/core/route-action.server";
import {
  drinkDraftSchema,
  SaveDrinkNoticeCodes,
  type AdminDrinksWriteService,
} from "#/app/modules/drinks/drinks";
import {
  parseCreateDrinkSubmission,
  parseUpdateDrinkSubmission,
} from "./admin-drink-submission.server";

type AdminDrinkWriteActionAdapterInput = {
  request: Request;
  adminDrinksWriteService: AdminDrinksWriteService;
};

export async function createAdminDrinkActionAdapter(input: AdminDrinkWriteActionAdapterInput) {
  const submission = await parseCreateDrinkSubmission(input.request);

  if (submission.kind === "invalid") {
    return data(
      {
        fieldErrors: submission.fieldErrors,
        formErrors: submission.formErrors,
      },
      { status: submission.status },
    );
  }

  return routeAction(
    input.request,
    intent({
      schema: drinkDraftSchema,
      operation: async (draft) => {
        const result = await input.adminDrinksWriteService.create({
          draft,
          imageBuffer: submission.imageUpload.buffer,
        });

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
        return { kind: "success", message: "Drink created!" };
      },
    }),
    { formData: submission.formData },
  );
}

export async function deleteAdminDrinkActionAdapter(
  input: AdminDrinkWriteActionAdapterInput & { slug: string },
) {
  return routeAction(
    input.request,
    intent({
      operation: async () => {
        const result = await input.adminDrinksWriteService.delete({ slug: input.slug });

        if (result.kind === "notFound") {
          throw new Response("Drink not found", { status: 404 });
        }

        return result;
      },
      redirectTo: href("/admin/drinks"),
      toast: { successMessage: "Drink deleted!" },
    }),
  );
}

export async function updateAdminDrinkActionAdapter(
  input: AdminDrinkWriteActionAdapterInput & { slug: string },
) {
  const submission = await parseUpdateDrinkSubmission(input.request);

  if (submission.kind === "invalid") {
    return data(
      {
        fieldErrors: submission.fieldErrors,
        formErrors: submission.formErrors,
      },
      { status: submission.status },
    );
  }

  return routeAction(
    input.request,
    intent({
      schema: drinkDraftSchema,
      operation: async (draft) => {
        const result = await input.adminDrinksWriteService.update({
          slug: input.slug,
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
    { formData: submission.formData },
  );
}
