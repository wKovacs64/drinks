import { sql } from 'drizzle-orm';
import { integer, text, sqliteTable } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  name: text('name'),
  avatarUrl: text('avatar_url'),
  role: text('role').notNull().$type<'user' | 'admin'>().default('user'),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
});

export const drinks = sqliteTable('drinks', {
  id: text('id').primaryKey(),
  slug: text('slug').notNull().unique(),
  title: text('title').notNull(),
  imageUrl: text('image_url').notNull(),
  imageFileId: text('image_file_id').notNull(),
  calories: integer('calories').notNull(),
  ingredients: text('ingredients', { mode: 'json' }).notNull().$type<string[]>(),
  tags: text('tags', { mode: 'json' }).notNull().$type<string[]>(),
  notes: text('notes'),
  rank: integer('rank').notNull().default(0),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Drink = typeof drinks.$inferSelect;
export type NewDrink = typeof drinks.$inferInsert;
