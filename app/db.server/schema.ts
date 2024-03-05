import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

// Note: CURRENT_TIMESTAMP will be in GMT.

export const cacheEntry = sqliteTable('cacheEntry', {
  id: integer('id').primaryKey(),
  createdAt: text('createdAt')
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
  updatedAt: text('updatedAt').notNull(),
  key: text('key').unique().notNull(),
  value: text('value').notNull(),
});
