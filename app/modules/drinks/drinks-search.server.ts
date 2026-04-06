import { remember, forget } from "@epic-web/remember";
import { desc, eq } from "drizzle-orm";
import MiniSearch from "minisearch";
import type { getDb } from "#/app/db/client.server";
import { drinks, type Drink } from "#/app/db/schema";

type Db = ReturnType<typeof getDb>;

const SEARCH_INSTANCE_CACHE_KEY = "minisearch-index";

type SearchableDrink = {
  id: string;
  slug: string;
  title: string;
  ingredients: string;
  notes: string;
};

type SearchData = {
  allDrinks: Drink[];
  searchIndex: MiniSearch<SearchableDrink>;
};

function createSearchIndex(allDrinks: Drink[]) {
  const searchableDrinks: SearchableDrink[] = allDrinks.map((drink) => ({
    id: drink.slug,
    slug: drink.slug,
    title: drink.title,
    ingredients: drink.ingredients.join(" "),
    notes: drink.notes ?? "",
  }));

  const miniSearch = new MiniSearch<SearchableDrink>({
    fields: ["title", "ingredients", "notes"],
    storeFields: ["slug"],
    searchOptions: {
      boost: { title: 3, ingredients: 2, notes: 1 },
      fuzzy: 0.2,
      prefix: true,
    },
  });

  miniSearch.addAll(searchableDrinks);

  return miniSearch;
}

function getSearchData(db: Db): Promise<SearchData> {
  return remember(SEARCH_INSTANCE_CACHE_KEY, async () => {
    const allDrinks = await db.query.drinks.findMany({
      where: eq(drinks.status, "published"),
      orderBy: [desc(drinks.rank), desc(drinks.createdAt)],
    });

    return {
      allDrinks,
      searchIndex: createSearchIndex(allDrinks),
    };
  });
}

export async function searchDrinks(db: Db, query: string): Promise<Drink[]> {
  const { allDrinks, searchIndex } = await getSearchData(db);
  const results = searchIndex.search(query, { combineWith: "AND" });

  return results
    .map((result) => allDrinks.find((drink) => drink.slug === result.slug))
    .filter((drink): drink is Drink => Boolean(drink));
}

export function purgeSearchCache() {
  forget(SEARCH_INSTANCE_CACHE_KEY);
}
