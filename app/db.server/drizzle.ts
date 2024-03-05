import { resolve } from 'pathe';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import { getEnvVars } from '~/utils/env.server';
import * as schema from './schema';

const { DATABASE_FILE_PATH } = getEnvVars();

export const betterSqlite = new Database(resolve(DATABASE_FILE_PATH));
betterSqlite.pragma('journal_mode = WAL');

export const db = drizzle(betterSqlite, { schema });

export * from './schema';
