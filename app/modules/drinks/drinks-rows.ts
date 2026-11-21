import { array, parse, string } from "remix/data-schema";
import type { TableRow } from "remix/data-table";
import type { drinks } from "#/app/db/schema.ts";
import { parseStoredEnumUnvalidatedByColumnType } from "#/app/db/stored-enum.ts";
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

const storedStringArraySchema = array(string());

export function toDrink(row: TableRow<typeof drinks>): Drink {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    imageUrl: row.image_url,
    imageFileId: row.image_file_id,
    calories: row.calories,
    ingredients: parse(storedStringArraySchema, row.ingredients),
    tags: parse(storedStringArraySchema, row.tags),
    notes: row.notes,
    rank: row.rank,
    status: parseStoredEnumUnvalidatedByColumnType(drinkStatusValues, row.status),
    createdAt: new Date(row.created_at * 1000),
    updatedAt: new Date(row.updated_at * 1000),
  };
}
