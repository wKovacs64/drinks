import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './app/db/schema.ts',
  out: './drizzle',
  dialect: 'sqlite',
  dbCredentials: {
    url: process.env.DATABASE_URL || './data/drinks.db',
  },
  strict: true,
  verbose: true,
});
