import { href, redirect } from "react-router";
import { getDb } from "#/app/db/client.server";
import { purgeDrinkCache } from "#/app/integrations/fastly.server";
import { deleteImage, uploadImage } from "#/app/integrations/imagekit.server";
import { createAdminDrinksWriteService } from "#/app/modules/drinks/drinks.server";
import { deleteAdminDrinkActionAdapter } from "#/app/web/admin-drink-write-route-adapter.server";
import type { Route } from "./+types/admin.drinks.$slug.delete";

export async function loader() {
  return redirect(href("/admin/drinks"));
}

export async function action({ request, params }: Route.ActionArgs) {
  const adminDrinksWriteService = createAdminDrinksWriteService({
    db: getDb(),
    writeEffects: { uploadImage, deleteImage, purgeDrinkCache },
  });

  return deleteAdminDrinkActionAdapter({
    request,
    slug: params.slug,
    adminDrinksWriteService,
  });
}
