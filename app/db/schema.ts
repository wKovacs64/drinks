import { column as c, table, type TableRow } from "remix/data-table";
import { array, enum_, parse, string } from "remix/data-schema";

export const users = table({
  name: "users",
  columns: {
    id: c.text().primaryKey(),
    email: c.text().unique(),
    name: c.text().nullable(),
    avatar_url: c.text().nullable(),
    role: c.enum(["user", "admin"]).default("user"),
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
    status: c.enum(["published", "unpublished"]).default("published"),
    created_at: c.integer().defaultSql("unixepoch()"),
    updated_at: c.integer().defaultSql("unixepoch()"),
  },
});
export type User = {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  role: "user" | "admin";
  createdAt: Date;
  updatedAt: Date;
};
export type Drink = {
  id: string;
  slug: string;
  title: string;
  imageUrl: string;
  imageFileId: string;
  calories: number;
  ingredients: string[];
  tags: string[];
  notes: string | null;
  rank: number;
  status: "published" | "unpublished";
  createdAt: Date;
  updatedAt: Date;
};
export type NewDrink = Omit<Drink, "createdAt" | "updatedAt" | "rank" | "status" | "notes"> &
  Partial<Pick<Drink, "createdAt" | "updatedAt" | "rank" | "status" | "notes">>;
export type NewUser = Omit<User, "createdAt" | "updatedAt"> &
  Partial<Pick<User, "createdAt" | "updatedAt">>;

export function readDrink(row: TableRow<typeof drinks>): Drink {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    imageUrl: row.image_url,
    imageFileId: row.image_file_id,
    calories: row.calories,
    ingredients: parse(array(string()), JSON.parse(row.ingredients)),
    tags: parse(array(string()), JSON.parse(row.tags)),
    notes: row.notes,
    rank: row.rank,
    status: parse(enum_(["published", "unpublished"]), row.status),
    createdAt: new Date(row.created_at * 1000),
    updatedAt: new Date(row.updated_at * 1000),
  };
}
export function writeDrink(drink: NewDrink): TableRow<typeof drinks> {
  return {
    id: drink.id,
    slug: drink.slug,
    title: drink.title,
    image_url: drink.imageUrl,
    image_file_id: drink.imageFileId,
    calories: drink.calories,
    ingredients: JSON.stringify(drink.ingredients),
    tags: JSON.stringify(drink.tags),
    notes: drink.notes ?? null,
    rank: drink.rank ?? 0,
    status: drink.status ?? "published",
    created_at: Math.floor((drink.createdAt?.getTime() ?? Date.now()) / 1000),
    updated_at: Math.floor((drink.updatedAt?.getTime() ?? Date.now()) / 1000),
  };
}
export function readUser(row: TableRow<typeof users>): User {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    avatarUrl: row.avatar_url,
    role: parse(enum_(["admin", "user"]), row.role),
    createdAt: new Date(row.created_at * 1000),
    updatedAt: new Date(row.updated_at * 1000),
  };
}
export function writeUser(user: NewUser): TableRow<typeof users> {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    avatar_url: user.avatarUrl,
    role: user.role,
    created_at: Math.floor((user.createdAt?.getTime() ?? Date.now()) / 1000),
    updated_at: Math.floor((user.updatedAt?.getTime() ?? Date.now()) / 1000),
  };
}
