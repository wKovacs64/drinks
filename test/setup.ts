import { afterAll, afterEach, beforeAll } from "vitest";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { getDb } from "#/app/db/index.server";
import { server } from "./server";

migrate(getDb(), { migrationsFolder: "./drizzle" });

beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
});

afterEach(() => {
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});
