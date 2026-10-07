import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { createSqliteDatabase } from "remix/data-table/sqlite";
import { getEnvVars } from "#/app/core/env.ts";
let database: ReturnType<typeof createSqliteDatabase> | undefined;
export function getDb() {
  if (!database) {
    const { DATABASE_URL } = getEnvVars();
    if (DATABASE_URL !== ":memory:") mkdirSync(dirname(DATABASE_URL), { recursive: true });
    database = createSqliteDatabase({ filename: DATABASE_URL, foreignKeys: true });
  }
  return database;
}
