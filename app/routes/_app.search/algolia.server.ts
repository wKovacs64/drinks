import { algoliaSearch } from '~/vendor/algoliasearch.cjs';
import { getEnvVars } from '~/utils/env.server.ts';

const { ALGOLIA_APP_ID, ALGOLIA_SEARCH_KEY, ALGOLIA_INDEX_NAME } = getEnvVars();
const searchClient = algoliaSearch(ALGOLIA_APP_ID, ALGOLIA_SEARCH_KEY);
export const drinksIndex = searchClient.initIndex(ALGOLIA_INDEX_NAME);
