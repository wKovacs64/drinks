import { remember, forget } from '@epic-web/remember';
import { getAllDrinks } from '#/app/models/drink.server';
import type { Drink } from '#/app/types';
import { createSearchIndex } from './minisearch.server';

export const SEARCH_INSTANCE_CACHE_KEY = 'minisearch-index';

type SearchData = {
  allDrinks: Drink[];
  searchIndex: ReturnType<typeof createSearchIndex>;
};

/**
 * Get the cached MiniSearch instance and allDrinks data, creating them if they don't exist
 * (which fetches all drinks from SQLite).
 */
export async function getSearchData(): Promise<SearchData> {
  return remember(SEARCH_INSTANCE_CACHE_KEY, async () => {
    const sqliteDrinks = await getAllDrinks();

    // Transform SQLite drinks to the format expected by createSearchIndex
    const allDrinks: Drink[] = sqliteDrinks.map((drink) => ({
      title: drink.title,
      slug: drink.slug,
      image: { url: drink.imageUrl },
      ingredients: drink.ingredients,
      calories: drink.calories,
      notes: drink.notes ?? undefined,
      tags: drink.tags,
    }));

    const searchIndex = createSearchIndex(allDrinks);

    return { allDrinks, searchIndex };
  });
}

/**
 * Purge the cached MiniSearch instance. Should be called when drinks are added, updated, or
 * removed.
 */
export function purgeSearchCache() {
  forget(SEARCH_INSTANCE_CACHE_KEY);
}
