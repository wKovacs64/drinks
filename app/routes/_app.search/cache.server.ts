import { remember, forget } from '@epic-web/remember';
import { data } from 'react-router';
import { getEnvVars } from '~/utils/env.server';
import { fetchGraphQL } from '~/utils/graphql.server';
import type { Drink, DrinksResponse } from '~/types';
import { createSearchIndex } from './minisearch.server';

export const SEARCH_INSTANCE_CACHE_KEY = 'minisearch-index';

type SearchData = {
  allDrinks: Drink[];
  searchIndex: ReturnType<typeof createSearchIndex>;
};

/**
 * Get the cached MiniSearch instance and allDrinks data, creating them if they don't exist
 * (which fetches all drinks from Contentful).
 */
export async function getSearchData(): Promise<SearchData> {
  return remember(SEARCH_INSTANCE_CACHE_KEY, async () => {
    const { CONTENTFUL_ACCESS_TOKEN, CONTENTFUL_URL, CONTENTFUL_PREVIEW } = getEnvVars();

    const allDrinksQuery = /* GraphQL */ `
      query ($preview: Boolean) {
        drinkCollection(preview: $preview, order: [rank_DESC, sys_firstPublishedAt_DESC]) {
          drinks: items {
            title
            slug
            image {
              url
            }
            ingredients
            calories
            notes
          }
        }
      }
    `;

    const queryResponse = await fetchGraphQL(
      CONTENTFUL_URL,
      CONTENTFUL_ACCESS_TOKEN,
      allDrinksQuery,
      {
        preview: CONTENTFUL_PREVIEW === 'true',
      },
    );

    const queryResponseJson: DrinksResponse = await queryResponse.json();

    if (queryResponseJson.errors?.length || !queryResponseJson.data.drinkCollection) {
      throw data(queryResponseJson, { status: 500 });
    }

    const {
      data: {
        drinkCollection: { drinks: maybeDrinks },
      },
    } = queryResponseJson;

    const allDrinks = maybeDrinks.filter((drink): drink is Drink => Boolean(drink));
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
