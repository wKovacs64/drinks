import { getDb } from "#/app/db/client.ts";
import { drinks } from "#/app/db/schema.ts";
import { migrateDatabase } from "#/scripts/migrate.ts";
import { TEST_DRINKS } from "#/test/database.ts";

await migrateDatabase();

await getDb().createMany(
  drinks,
  TEST_DRINKS.map((drink) => ({ ...drink, image_url: "/images/background-768.jpg" })),
);

await import("#/server.ts");
