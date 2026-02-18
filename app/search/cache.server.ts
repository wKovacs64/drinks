import { remember, forget } from '@epic-web/remember';
import { getAllDrinks } from '#/app/models/drink.server';
import type { Drink } from '#/app/db/schema';
import { createSearchIndex } from '#/app/search/minisearch.server';

const SEARCH_INSTANCE_CACHE_KEY = 'minisearch-index';

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
    const allDrinks = await getAllDrinks();
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
