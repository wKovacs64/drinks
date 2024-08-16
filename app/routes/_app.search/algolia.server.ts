import { liteClient } from 'algoliasearch/lite';
import { getEnvVars } from '~/utils/env.server';

const { ALGOLIA_APP_ID, ALGOLIA_SEARCH_KEY } = getEnvVars();

export const searchClient = liteClient(ALGOLIA_APP_ID, ALGOLIA_SEARCH_KEY);
