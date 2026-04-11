import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { getEnvVars } from "#/app/core/env.server";
import * as schema from "./schema";

let sqlite: Database.Database | null = null;

function getDatabase() {
  if (!sqlite) {
    const { DATABASE_URL } = getEnvVars();
    sqlite = new Database(DATABASE_URL);
    sqlite.pragma("journal_mode = WAL");
  }
  return sqlite;
}

export function getDb() {
  return drizzle(getDatabase(), { schema });
}
