import { getDb } from "#/app/db/client.server.ts";
import { createAdminDrinksWriteService } from "#/app/modules/drinks/drinks.server.ts";
import { uploadImage, deleteImage } from "#/app/integrations/imagekit.server.ts";
import { purgeDrinkCache } from "#/app/integrations/fastly.server.ts";
export function createDrinkWriteService() {
  return createAdminDrinksWriteService({
    db: getDb(),
    writeEffects: { uploadImage, deleteImage, purgeDrinkCache },
  });
}
