import { getDb } from "#/app/db/client.ts";
import { drinks, writeDrink } from "#/app/db/schema.ts";
import { migrateDatabase } from "#/scripts/migrate.ts";
import { TEST_DRINKS } from "#/test/database.ts";
// Seed the in-memory database before the production server starts in this process.
await migrateDatabase();
await getDb().createMany(
  drinks,
  // A same-origin JPEG stands in for ImageKit so the lab LCP element is a real image.
  TEST_DRINKS.map((drink) => writeDrink({ ...drink, imageUrl: "/images/background-768.jpg" })),
);
await import("#/server.ts");
