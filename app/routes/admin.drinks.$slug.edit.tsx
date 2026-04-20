import { data, href } from "react-router";
import { routeAction } from "#/app/core/route-action.server";
import { getFormErrors } from "#/app/core/utils";
import { getDb } from "#/app/db/client.server";
import { purgeDrinkCache } from "#/app/integrations/fastly.server";
import { deleteImage, uploadImage } from "#/app/integrations/imagekit.server";
import { createDrinksService, DrinkEditorNotFoundError } from "#/app/modules/drinks/drinks.server";
import { DrinkForm } from "#/app/ui/admin/drink-form";
import { createAdminDrinkWriteWorkflow } from "#/app/workflows/admin-drink-write.server";
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
  const workflow = createAdminDrinkWriteWorkflow({
    db: getDb(),
    uploadImage,
    deleteImage,
    purgeDrinkCache,
  });

  const preparation = await workflow.prepareUpdate({
    request,
    slug: params.slug,
  });

  if (preparation.kind === "invalid") {
    return data(
      {
        fieldErrors: preparation.fieldErrors,
        formErrors: preparation.formErrors,
      },
      { status: preparation.status },
    );
  }

  return routeAction(request, preparation.intent);
}
