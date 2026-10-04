import { loadMigrations } from "remix/data-table/migrations/node";
import { fileURLToPath } from "node:url";
import { getDb } from "#/app/db/client.server.ts";
export async function migrateDatabase() {
  await getDb().migrate(
    await loadMigrations(fileURLToPath(new URL("../app/db/migrations", import.meta.url))),
  );
}
if (import.meta.main) {
  await migrateDatabase();
  await getDb().close();
}
