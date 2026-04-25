import { data, href } from "react-router";
import { DomainError, FieldDomainError } from "#/app/core/errors";
import { intent, routeAction } from "#/app/core/route-action.server";
import { getFormErrors } from "#/app/core/utils";
import { getDb } from "#/app/db/client.server";
import { purgeDrinkCache } from "#/app/integrations/fastly.server";
import { deleteImage, uploadImage } from "#/app/integrations/imagekit.server";
import { drinkDraftSchema, SaveDrinkNoticeCodes } from "#/app/modules/drinks/drinks";
import {
  createAdminDrinksWriteService,
  createDrinksService,
  DrinkEditorNotFoundError,
} from "#/app/modules/drinks/drinks.server";
import { DrinkForm } from "#/app/ui/admin/drink-form";
import { parseUpdateDrinkSubmission } from "./admin-drink-submission.server";
import type { Route } from "./+types/admin.drinks.$slug.edit";

export async function loader({ params }: Route.LoaderArgs) {
  const drinksService = createDrinksService({ db: getDb() });

  try {
    const editor = await drinksService.getDrinkEditorBySlug(params.slug);
    return { editor, slug: params.slug };
  } catch (error) {
    if (error instanceof DrinkEditorNotFoundError) {
      throw new Response("Drink not found", { status: 404 });
    }

    throw error;
  }
}

export default function EditDrinkPage({ loaderData, actionData }: Route.ComponentProps) {
  const { editor, slug } = loaderData;

  return (
    <div>
      <title>{`Edit ${editor.initialValues.title} | drinks.fyi`}</title>
      <h1 className="mb-6 text-2xl font-medium text-zinc-200">Edit Drink</h1>
      <DrinkForm
        editor={editor}
        action={href("/admin/drinks/:slug/edit", { slug })}
        errors={getFormErrors(actionData)}
      />
    </div>
  );
}

export async function action({ request, params }: Route.ActionArgs) {
  const submission = await parseUpdateDrinkSubmission(request);

  if (submission.kind === "invalid") {
    return data(
      {
        fieldErrors: submission.fieldErrors,
        formErrors: submission.formErrors,
      },
      { status: submission.status },
    );
  }

  const adminDrinksWriteService = createAdminDrinksWriteService({
    db: getDb(),
    writeEffects: { uploadImage, deleteImage, purgeDrinkCache },
  });

  return routeAction(
    request,
    intent({
      schema: drinkDraftSchema,
      operation: async (draft) => {
        const result = await adminDrinksWriteService.update({
          slug: params.slug,
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
