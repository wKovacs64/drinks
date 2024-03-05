import 'dotenv/config';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { betterSqlite, db } from './drizzle';

migrate(db, { migrationsFolder: './app/db.server' });

betterSqlite.close();
