import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { getEnvVars } from '#/app/utils/env.server';
import * as schema from './schema';

const { DATABASE_URL } = getEnvVars();

let sqlite: Database.Database | null = null;

function getDatabase() {
  if (!sqlite) {
    sqlite = new Database(DATABASE_URL);
    sqlite.pragma('journal_mode = WAL');
  }
  return sqlite;
}

export function getDb() {
  return drizzle(getDatabase(), { schema });
}
