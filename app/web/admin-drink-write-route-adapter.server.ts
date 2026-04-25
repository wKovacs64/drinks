import { data, href } from "react-router";
import { DomainError, FieldDomainError } from "#/app/core/errors";
import { intent, routeAction } from "#/app/core/route-action.server";
import { drinkDraftSchema, type AdminDrinksWriteService } from "#/app/modules/drinks/drinks";
import { parseCreateDrinkSubmission } from "./admin-drink-submission.server";

export async function createAdminDrinkActionAdapter(input: {
  request: Request;
  adminDrinksWriteService: AdminDrinksWriteService;
}) {
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
