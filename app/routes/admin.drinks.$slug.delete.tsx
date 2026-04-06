import { redirect, href } from "react-router";
import { intent, routeAction } from "#/app/core/route-action.server";
import { getDb } from "#/app/db/client.server";
import { purgeDrinkCache } from "#/app/integrations/fastly.server";
import { deleteImage, uploadImage } from "#/app/integrations/imagekit.server";
import { createDrinksService } from "#/app/modules/drinks/drinks.server";
import type { Route } from "./+types/admin.drinks.$slug.delete";

export async function loader() {
  return redirect(href("/admin/drinks"));
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

  return routeAction(
    request,
    intent({
      operation: async () => drinksService.deleteDrink({ slug: params.slug }),
      redirectTo: href("/admin/drinks"),
      toast: {
        successMessage: "Drink deleted!",
      },
    }),
  );
}
