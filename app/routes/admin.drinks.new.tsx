import { href } from "react-router";
import { getFormErrors } from "#/app/core/utils";
import { getDb } from "#/app/db/client.server";
import { purgeDrinkCache } from "#/app/integrations/fastly.server";
import { deleteImage, uploadImage } from "#/app/integrations/imagekit.server";
import { createAdminDrinksWriteService } from "#/app/modules/drinks/drinks.server";
import { DrinkForm } from "#/app/ui/admin/drink-form";
import { createAdminDrinkActionAdapter } from "#/app/web/admin-drink-write-route-adapter.server";
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
  const adminDrinksWriteService = createAdminDrinksWriteService({
    db: getDb(),
    writeEffects: { uploadImage, deleteImage, purgeDrinkCache },
  });

  return createAdminDrinkActionAdapter({ request, adminDrinksWriteService });
}
