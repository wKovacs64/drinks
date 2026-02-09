import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { getEnvVars } from '#/app/utils/env.server';
import * as schema from './schema';

const { DATABASE_URL } = getEnvVars();

let sqlite: Database.Database | null = null;

export function getDatabase() {
  if (!sqlite) {
    sqlite = new Database(DATABASE_URL);
    sqlite.pragma('journal_mode = WAL');
  }
  return sqlite;
}

export function closeDatabase() {
  if (sqlite) {
    sqlite.close();
    sqlite = null;
  }
}

export function resetDatabaseConnection() {
  closeDatabase();
  return getDatabase();
}

export const db = drizzle(getDatabase(), { schema });

export function getDb() {
  return drizzle(getDatabase(), { schema });
}
