import type { DataFunctionArgs } from '@remix-run/node';
import kebabCase from 'lodash/kebabCase';
import pThrottle from 'p-throttle';
import { getEnvVars } from '~/utils/env.server';
import { cache } from '~/utils/cache.server';
import {
  loader as allDrinksLoader,
  type LoaderData as AllDrinksLoaderData,
} from '~/routes/_app._index';
import { loader as drinkLoader } from '~/routes/_app.$slug';
import {
  loader as allTagsLoader,
  type LoaderData as AllTagsLoaderData,
} from '~/routes/_app.tags._index';
import { loader as tagLoader } from '~/routes/_app.tags.$tag';

const { CONTENTFUL_PREVIEW } = getEnvVars();

// https://www.contentful.com/developers/docs/technical-limits/
const throttle = pThrottle({
  limit: CONTENTFUL_PREVIEW === 'true' ? 13 : 54,
  interval: 1000,
});

export async function primeContentCache() {
  try {
    console.log('🚒 priming content cache...');

    // 1. Start with an empty cache
    await cache.clear();

    // 2. Load and cache all drinks
    const allDrinksDataFnArgs: DataFunctionArgs = {
      context: {},
      params: {},
      request: new Request('https://drinks.fyi'),
    };
    const throttledAllDrinksLoader = throttle(allDrinksLoader);
    const allDrinksResponse: Response = await throttledAllDrinksLoader(
      allDrinksDataFnArgs,
    );
    const allDrinksData: AllDrinksLoaderData = await allDrinksResponse.json();
    const drinks = allDrinksData.drinks.filter(Boolean);

    // 3. Load and cache each individual drink
    const allSlugs = drinks.map(({ slug }) => slug);
    const throttledDrinkLoader = throttle(drinkLoader);
    await Promise.all(
      allSlugs.map(async (slug) => {
        const drinkDataFnArgs: DataFunctionArgs = {
          context: {},
          params: { slug },
          request: new Request(`https://drinks.fyi/${slug}`),
        };
        return throttledDrinkLoader(drinkDataFnArgs);
      }),
    );

    // 4. Load and cache all tags
    const allTagsDataFnArgs: DataFunctionArgs = {
      context: {},
      params: {},
      request: new Request('https://drinks.fyi/tags'),
    };
    const throttledAllTagsLoader = throttle(allTagsLoader);
    const allTagsResponse: Response = await throttledAllTagsLoader(
      allTagsDataFnArgs,
    );
    const allTagsData: AllTagsLoaderData = await allTagsResponse.json();
    const { tags } = allTagsData;

    // 5. Load and cache each individual tag
    const throttledTagLoader = throttle(tagLoader);
    await Promise.all(
      tags.map(async (tag) => {
        const tagSlug = kebabCase(tag);
        const tagDataFnArgs: DataFunctionArgs = {
          context: {},
          params: { tag: tagSlug },
          request: new Request(`https://drinks.fyi/tags/${tagSlug}`),
        };
        return throttledTagLoader(tagDataFnArgs);
      }),
    );

    console.log('🔥 content cache is warm');
  } catch (err) {
    if (err instanceof Response) {
      console.error(`💣 failed to warm cache: ${await err.text()}`);
    } else {
      console.error(err);
    }
  }
}
