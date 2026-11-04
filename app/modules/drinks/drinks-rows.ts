import { array, enum_, parse, string } from "remix/data-schema";
import type { TableRow } from "remix/data-table";
import type { drinks } from "#/app/db/schema.ts";
import { drinkStatusValues, type DrinkStatus } from "./drinks-contract.ts";

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
  status: DrinkStatus;
  createdAt: Date;
  updatedAt: Date;
};

/**
 * Decode a stored `drinks` row. `c.enum` does not validate stored values, so `status` is checked
 * here; JSON columns are parsed as string arrays. Throws `ValidationError` on invalid data.
 */
export function toDrink(row: TableRow<typeof drinks>): Drink {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    imageUrl: row.image_url,
    imageFileId: row.image_file_id,
    calories: row.calories,
    ingredients: parseStringArrayColumn(row.ingredients),
    tags: parseStringArrayColumn(row.tags),
    notes: row.notes,
    rank: row.rank,
    status: parse(enum_(drinkStatusValues), row.status),
    createdAt: new Date(row.created_at * 1000),
    updatedAt: new Date(row.updated_at * 1000),
  };
}

function parseStringArrayColumn(value: string): string[] {
  return parse(array(string()), JSON.parse(value));
}
