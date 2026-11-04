import { rawSql, type TableRow } from "remix/data-table";
import { env } from "#/app/core/env.ts";
import { getDb } from "#/app/db/client.ts";
import { users, drinks } from "#/app/db/schema.ts";

// 1x1 transparent PNG as a data URI to avoid external network requests in tests
const TEST_IMAGE_URL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

export const TEST_ADMIN_USER = {
  id: "test-admin-id",
  email: "admin@test.com",
  name: "Test Admin",
  avatar_url: null,
  role: "admin",
} satisfies Partial<TableRow<typeof users>>;

export const TEST_DRINKS = [
  {
    id: "test-drink-1",
    slug: "test-margarita",
    title: "Test Margarita",
    image_url: TEST_IMAGE_URL,
    image_file_id: "seed-fileId-1",
    calories: 200,
    ingredients: JSON.stringify(["2 oz tequila", "1 oz lime juice", "1 oz triple sec"]),
    tags: JSON.stringify(["tequila", "citrus"]),
    notes: "A classic test margarita",
    rank: 10,
  },
  {
    id: "test-drink-2",
    slug: "test-mojito",
    title: "Test Mojito",
    image_url: TEST_IMAGE_URL,
    image_file_id: "seed-fileId-2",
    calories: 150,
    ingredients: JSON.stringify(["2 oz rum", "1 oz lime juice", "mint leaves", "soda water"]),
    tags: JSON.stringify(["rum", "citrus", "mint"]),
    notes: "A refreshing test mojito",
    rank: 5,
  },
  {
    id: "test-drink-3",
    slug: "test-old-fashioned",
    title: "Test Old Fashioned",
    image_url: TEST_IMAGE_URL,
    image_file_id: "seed-fileId-3",
    calories: 180,
    ingredients: JSON.stringify(["2 oz bourbon", "1 sugar cube", "angostura bitters"]),
    tags: JSON.stringify(["bourbon", "classic"]),
    notes: null,
    rank: 0,
  },
] satisfies Partial<TableRow<typeof drinks>>[];

export async function resetAndSeedDatabase() {
  if (env.NODE_ENV !== "test") throw new Error("Reset is only available in test mode");
  const db = getDb();
  await db.exec(rawSql("DELETE FROM drinks"));
  await db.exec(rawSql("DELETE FROM users"));
  await db.create(users, TEST_ADMIN_USER);
  await db.createMany(drinks, TEST_DRINKS);
}
