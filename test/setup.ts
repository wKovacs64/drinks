import { afterAll, afterEach, beforeAll } from "remix/test";
import { migrateDatabase } from "#/scripts/migrate.ts";
import { server } from "./server.ts";

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
