import { column as c, table } from "remix/data-table";

export const users = table({
  name: "users",
  columns: {
    id: c.text().primaryKey(),
    email: c.text().unique(),
    name: c.text().nullable(),
    avatar_url: c.text().nullable(),
    role: c.enum(["user", "admin"] as const).default("user"),
    created_at: c.integer().defaultSql("unixepoch()"),
    updated_at: c.integer().defaultSql("unixepoch()"),
  },
});
export const drinks = table({
  name: "drinks",
  columns: {
    id: c.text().primaryKey(),
    slug: c.text().unique(),
    title: c.text(),
    image_url: c.text(),
    image_file_id: c.text(),
    calories: c.integer(),
    ingredients: c.text(),
    tags: c.text(),
    notes: c.text().nullable(),
    rank: c.integer().default(0),
    status: c.enum(["published", "unpublished"] as const).default("published"),
    created_at: c.integer().defaultSql("unixepoch()"),
    updated_at: c.integer().defaultSql("unixepoch()"),
  },
});
