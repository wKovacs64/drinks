import { href } from "react-router";
import { getFormErrors } from "#/app/core/utils";
import { getDb } from "#/app/db/client.server";
import { purgeDrinkCache } from "#/app/integrations/fastly.server";
import { deleteImage, uploadImage } from "#/app/integrations/imagekit.server";
import {
  createAdminDrinksWriteService,
  createDrinksService,
  DrinkEditorNotFoundError,
} from "#/app/modules/drinks/drinks.server";
import { DrinkForm } from "#/app/ui/admin/drink-form";
import { updateAdminDrinkActionAdapter } from "#/app/web/admin-drink-write-route-adapter.server";
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
  const adminDrinksWriteService = createAdminDrinksWriteService({
    db: getDb(),
    writeEffects: { uploadImage, deleteImage, purgeDrinkCache },
  });

  return updateAdminDrinkActionAdapter({
    request,
    slug: params.slug,
    adminDrinksWriteService,
  });
}
