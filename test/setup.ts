import { afterAll, afterEach, beforeAll } from "remix/test";
import { migrateDatabase } from "#/scripts/migrate.ts";
import { server } from "./server.ts";

// Ensure schema exists (test DB may be empty)
await migrateDatabase();

beforeAll(() => {
  server.listen({ onUnhandledFrame: "error" });
});

afterEach(() => {
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});
