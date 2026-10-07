import MiniSearch from "minisearch";
import type { getDb } from "#/app/db/client.ts";
import { drinks, readDrink, type Drink } from "#/app/db/schema.ts";
let searchData: { allDrinks: Drink[]; searchIndex: MiniSearch } | undefined;
export async function searchDrinks(db: ReturnType<typeof getDb>, query: string): Promise<Drink[]> {
  if (!searchData) {
    const allDrinks = (
      await db.findMany(drinks, {
        where: { status: "published" },
        orderBy: [
          ["rank", "desc"],
          ["created_at", "desc"],
        ],
      })
    ).map(readDrink);
    const searchIndex = new MiniSearch({
      fields: ["title", "ingredients", "notes"],
      storeFields: ["slug"],
      searchOptions: { boost: { title: 3, ingredients: 2, notes: 1 }, fuzzy: 0.2, prefix: true },
    });
    searchIndex.addAll(
      allDrinks.map((drink) => ({
        id: drink.slug,
        slug: drink.slug,
        title: drink.title,
        ingredients: drink.ingredients.join(" "),
        notes: drink.notes ?? "",
      })),
    );
    searchData = { allDrinks, searchIndex };
  }
  const { allDrinks, searchIndex } = searchData;
  return searchIndex
    .search(query, { combineWith: "AND" })
    .map((result) => allDrinks.find((drink) => drink.slug === result.slug))
    .filter((drink): drink is Drink => Boolean(drink));
}
export function purgeSearchCache() {
  searchData = undefined;
}
