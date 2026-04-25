import { data, href } from "react-router";
import { intent, routeAction } from "#/app/core/route-action.server";
import { getFormErrors } from "#/app/core/utils";
import { getDb } from "#/app/db/client.server";
import { purgeDrinkCache } from "#/app/integrations/fastly.server";
import { deleteImage, uploadImage } from "#/app/integrations/imagekit.server";
import { drinkDraftSchema } from "#/app/modules/drinks/drinks";
import { createAdminDrinksWriteService } from "#/app/modules/drinks/drinks.server";
import { DrinkForm } from "#/app/ui/admin/drink-form";
import { parseCreateDrinkSubmission } from "#/app/workflows/admin-drink-submission.server";
import type { Route } from "./+types/admin.drinks.new";

export default function NewDrinkPage({ actionData }: Route.ComponentProps) {
  return (
    <div>
      <title>New Drink | drinks.fyi</title>
      <h1 className="mb-6 text-2xl font-medium text-zinc-200">Add New Drink</h1>
      <DrinkForm action={href("/admin/drinks/new")} errors={getFormErrors(actionData)} />
    </div>
  );
}

export async function action({ request }: Route.ActionArgs) {
  const submission = await parseCreateDrinkSubmission(request);

  if (submission.kind === "invalid") {
    return data(
      {
        fieldErrors: submission.fieldErrors,
        formErrors: submission.formErrors,
      },
      { status: submission.status },
    );
  }

  if (!submission.imageUpload) {
    throw new Error("Create drink submission parser returned ready without an image upload");
  }

  const imageUpload = submission.imageUpload;
  const adminDrinksWriteService = createAdminDrinksWriteService({
    db: getDb(),
    writeEffects: { uploadImage, deleteImage, purgeDrinkCache },
  });

  return routeAction(
    request,
    intent({
      schema: drinkDraftSchema,
      operation: async (draft) =>
        adminDrinksWriteService.create({
          draft,
          imageBuffer: imageUpload.buffer,
        }),
      redirectTo: href("/admin/drinks"),
      toast: { successMessage: "Drink created!" },
    }),
    { formData: submission.formData },
  );
}
