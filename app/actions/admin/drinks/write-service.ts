import { getDb } from "#/app/db/client.ts";
import { createAdminDrinksWriteService } from "#/app/modules/drinks/drinks.ts";
import { uploadImage, deleteImage } from "#/app/integrations/imagekit.ts";
import { purgeDrinkCache } from "#/app/integrations/fastly.ts";
export function createDrinkWriteService() {
  return createAdminDrinksWriteService({
    db: getDb(),
    writeEffects: { uploadImage, deleteImage, purgeDrinkCache },
  });
}
