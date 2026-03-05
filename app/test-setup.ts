import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { getDb } from "#/app/db/client.server";

migrate(getDb(), { migrationsFolder: "./drizzle" });
