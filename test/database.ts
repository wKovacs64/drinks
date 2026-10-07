import { rawSql } from "remix/data-table";
import { getEnvVars } from "#/app/core/env.ts";
import { getDb } from "#/app/db/client.ts";
import {
  users,
  drinks,
  writeDrink,
  writeUser,
  type NewUser,
  type NewDrink,
} from "#/app/db/schema.ts";

// 1x1 transparent PNG as a data URI to avoid external network requests in tests
const TEST_IMAGE_URL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

export const TEST_ADMIN_USER: NewUser = {
  id: "test-admin-id",
  email: "admin@test.com",
  name: "Test Admin",
  avatarUrl: null,
  role: "admin",
};

export const TEST_DRINKS: Omit<NewDrink, "createdAt" | "updatedAt">[] = [
  {
    id: "test-drink-1",
    slug: "test-margarita",
    title: "Test Margarita",
    imageUrl: TEST_IMAGE_URL,
    imageFileId: "seed-fileId-1",
    calories: 200,
    ingredients: ["2 oz tequila", "1 oz lime juice", "1 oz triple sec"],
    tags: ["tequila", "citrus"],
    notes: "A classic test margarita",
    rank: 10,
  },
  {
    id: "test-drink-2",
    slug: "test-mojito",
    title: "Test Mojito",
    imageUrl: TEST_IMAGE_URL,
    imageFileId: "seed-fileId-2",
    calories: 150,
    ingredients: ["2 oz rum", "1 oz lime juice", "mint leaves", "soda water"],
    tags: ["rum", "citrus", "mint"],
    notes: "A refreshing test mojito",
    rank: 5,
  },
  {
    id: "test-drink-3",
    slug: "test-old-fashioned",
    title: "Test Old Fashioned",
    imageUrl: TEST_IMAGE_URL,
    imageFileId: "seed-fileId-3",
    calories: 180,
    ingredients: ["2 oz bourbon", "1 sugar cube", "angostura bitters"],
    tags: ["bourbon", "classic"],
    notes: null,
    rank: 0,
  },
];

export async function resetAndSeedDatabase() {
  if (getEnvVars().NODE_ENV !== "test") throw new Error("Reset is only available in test mode");
  const db = getDb();
  await db.exec(rawSql("DELETE FROM drinks"));
  await db.exec(rawSql("DELETE FROM users"));
  await db.create(users, writeUser(TEST_ADMIN_USER));
  await db.createMany(drinks, TEST_DRINKS.map(writeDrink));
}
