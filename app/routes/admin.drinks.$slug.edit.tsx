import { data, href } from "react-router";
import { DomainError } from "#/app/core/errors";
import { parseImageUpload } from "#/app/core/image-upload.server";
import { intent, routeAction } from "#/app/core/route-action.server";
import { getFormErrors } from "#/app/core/utils";
import { getDb } from "#/app/db/client.server";
import { purgeDrinkCache } from "#/app/integrations/fastly.server";
import { deleteImage, uploadImage } from "#/app/integrations/imagekit.server";
import { drinkDraftSchema, SaveDrinkNoticeCodes } from "#/app/modules/drinks/drinks";
import { createDrinksService, DrinkEditorNotFoundError } from "#/app/modules/drinks/drinks.server";
import { DrinkForm } from "#/app/ui/admin/drink-form";
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
  const drinksService = createDrinksService({
    db: getDb(),
    writeEffects: {
      uploadImage,
      deleteImage,
      purgeDrinkCache,
    },
  });
  const { imageUpload, imageError } = await parseImageUpload(request.clone());

  if (imageError) {
    return data({ fieldErrors: {}, formErrors: [imageError] }, { status: 400 });
  }

  return routeAction(
    request,
    intent({
      schema: drinkDraftSchema,
      operation: async (draft) =>
        drinksService.updateDrink({
          slug: params.slug,
          draft,
          imageBuffer: imageUpload?.buffer,
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
  );
}
