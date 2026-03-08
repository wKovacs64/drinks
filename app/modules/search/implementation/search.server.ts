import { remember, forget } from "@epic-web/remember";
import MiniSearch from "minisearch";
import { getPublishedDrinks } from "#/app/modules/drinks/index.server";
import type { Drink } from "#/app/db/schema";

const CACHE_KEY = "minisearch-index";

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

function createSearchIndex(drinks: Drink[]): MiniSearch<SearchableDrink> {
  const searchableDrinks: SearchableDrink[] = drinks.map((drink) => ({
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

async function getSearchData(): Promise<SearchData> {
  return remember(CACHE_KEY, async () => {
    const allDrinks = await getPublishedDrinks();
    const searchIndex = createSearchIndex(allDrinks);
    return { allDrinks, searchIndex };
  });
}

export async function searchDrinks(query: string): Promise<Drink[]> {
  const { allDrinks, searchIndex } = await getSearchData();
  const results = searchIndex.search(query, { combineWith: "AND" });

  return results
    .map((result) => allDrinks.find((drink) => drink.slug === result.slug))
    .filter((drink): drink is Drink => Boolean(drink));
}

export function purgeSearchCache() {
  forget(CACHE_KEY);
}
