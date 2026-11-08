import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { createSqliteDatabase } from "remix/data-table/sqlite";
import { env } from "#/app/core/env.ts";

let database: ReturnType<typeof createSqliteDatabase> | undefined;

export function getDb() {
  if (!database) {
    if (env.DATABASE_URL !== ":memory:") mkdirSync(dirname(env.DATABASE_URL), { recursive: true });
    database = createSqliteDatabase({ filename: env.DATABASE_URL, foreignKeys: true });
  }

  return database;
}
