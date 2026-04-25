import { data, href } from "react-router";
import { routeAction } from "#/app/core/route-action.server";
import { getFormErrors } from "#/app/core/utils";
import { getDb } from "#/app/db/client.server";
import { purgeDrinkCache } from "#/app/integrations/fastly.server";
import { deleteImage, uploadImage } from "#/app/integrations/imagekit.server";
import { DrinkForm } from "#/app/ui/admin/drink-form";
import { createAdminDrinkWriteWorkflow } from "#/app/workflows/admin-drink-write.server";
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
  const workflow = createAdminDrinkWriteWorkflow({
    db: getDb(),
    uploadImage,
    deleteImage,
    purgeDrinkCache,
  });

  const preparation = await workflow.prepareCreate({ request });

  if (preparation.kind === "invalid") {
    return data(
      {
        fieldErrors: preparation.fieldErrors,
        formErrors: preparation.formErrors,
      },
      { status: preparation.status },
    );
  }

  return routeAction(request, preparation.intent, { formData: preparation.formData });
}
