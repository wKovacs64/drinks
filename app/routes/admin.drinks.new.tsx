import { data, href } from "react-router";
import { parseImageUpload } from "#/app/core/image-upload.server";
import { intent, routeAction } from "#/app/core/route-action.server";
import { getFormErrors } from "#/app/core/utils";
import { getDb } from "#/app/db/client.server";
import { purgeDrinkCache } from "#/app/integrations/fastly.server";
import { deleteImage, uploadImage } from "#/app/integrations/imagekit.server";
import { drinkDraftSchema } from "#/app/modules/drinks/drinks";
import { createDrinksService } from "#/app/modules/drinks/drinks.server";
import { DrinkForm } from "#/app/ui/admin/drink-form";
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
  const { imageUpload, imageError } = await parseImageUpload(request.clone());

  if (imageError) {
    return data({ fieldErrors: {}, formErrors: [imageError] }, { status: 400 });
  }

  if (!imageUpload) {
    return data({ fieldErrors: {}, formErrors: ["Image is required"] }, { status: 400 });
  }

  const drinksService = createDrinksService({
    db: getDb(),
    writeEffects: {
      uploadImage,
      deleteImage,
      purgeDrinkCache,
    },
  });

  return routeAction(
    request,
    intent({
      schema: drinkDraftSchema,
      operation: async (draft) =>
        drinksService.createDrink({
          draft,
          imageBuffer: imageUpload.buffer,
        }),
      redirectTo: href("/admin/drinks"),
      toast: {
        successMessage: "Drink created!",
      },
    }),
  );
}
