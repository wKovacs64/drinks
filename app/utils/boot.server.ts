import type { DataFunctionArgs } from '@remix-run/node';
import { cache } from '~/utils/cache.server';
import {
  loader as allDrinksLoader,
  type LoaderData as AllDrinksLoaderData,
} from '~/routes/index';
import { loader as drinkLoader } from '~/routes/$slug';
import {
  loader as allTagsLoader,
  type LoaderData as AllTagsLoaderData,
} from '~/routes/tags/index';
import { loader as tagLoader } from '~/routes/tags/$tag';

export async function primeContentCache() {
  try {
    console.log('🚒 warming up content cache...');

    // 1. Start with an empty cache
    await cache.clear();

    // 2. Load and cache all drinks
    const allDrinksDataFnArgs: DataFunctionArgs = {
      context: {},
      params: {},
      request: new Request('https://drinks.fyi'),
    };
    const allDrinksResponse: Response = await allDrinksLoader(
      allDrinksDataFnArgs,
    );
    const allDrinksData: AllDrinksLoaderData = await allDrinksResponse.json();
    const { drinks } = allDrinksData;

    // 3. Load and cache each individual drink
    const allSlugs = drinks.map(({ slug }) => slug);
    await Promise.all(
      allSlugs.map(async (slug) => {
        const drinkDataFnArgs: DataFunctionArgs = {
          context: {},
          params: { slug },
          request: new Request(`https://drinks.fyi/${slug}`),
        };
        return drinkLoader(drinkDataFnArgs);
      }),
    );

    // 4. Load and cache all tags
    const allTagsDataFnArgs: DataFunctionArgs = {
      context: {},
      params: {},
      request: new Request('https://drinks.fyi/tags'),
    };
    const allTagsResponse: Response = await allTagsLoader(allTagsDataFnArgs);
    const allTagsData: AllTagsLoaderData = await allTagsResponse.json();
    const { tags } = allTagsData;

    // 5. Load and cache each individual tag
    await Promise.all(
      tags.map(async (tag) => {
        const tagDataFnArgs: DataFunctionArgs = {
          context: {},
          params: { tag },
          request: new Request(`https://drinks.fyi/tags/${tag}`),
        };
        return tagLoader(tagDataFnArgs);
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
