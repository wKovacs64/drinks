import { redirect, href } from "react-router";
import { routeAction } from "#/app/core/route-action.server";
import { getDb } from "#/app/db/client.server";
import { purgeDrinkCache } from "#/app/integrations/fastly.server";
import { deleteImage, uploadImage } from "#/app/integrations/imagekit.server";
import { createAdminDrinkWriteWorkflow } from "#/app/workflows/admin-drink-write.server";
import type { Route } from "./+types/admin.drinks.$slug.delete";

export async function loader() {
  return redirect(href("/admin/drinks"));
}

export async function action({ request, params }: Route.ActionArgs) {
  const workflow = createAdminDrinkWriteWorkflow({
    db: getDb(),
    uploadImage,
    deleteImage,
    purgeDrinkCache,
  });

  const deleteIntent = await workflow.prepareDelete({ slug: params.slug });

  return routeAction(request, deleteIntent);
}
