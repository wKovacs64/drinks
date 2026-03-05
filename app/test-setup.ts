import { afterAll, afterEach, beforeAll } from "vitest";
import { setupServer } from "msw/node";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { getDb } from "#/app/db/client.server";
import { handlers } from "#/app/test-handlers";

migrate(getDb(), { migrationsFolder: "./drizzle" });

const server = setupServer(...handlers);

beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
});

afterEach(() => {
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});
