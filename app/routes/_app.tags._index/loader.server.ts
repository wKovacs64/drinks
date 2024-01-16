import {
  json,
  type LoaderFunctionArgs,
  type SerializeFrom,
} from '@remix-run/node';
import { getEnvVars } from '~/utils/env.server';
import { fetchGraphQL } from '~/utils/graphql.server';
import { cache } from '~/utils/cache.server';
import type { Drink, DrinkTagsResponse } from '~/types';

export type LoaderData = SerializeFrom<typeof loader>;

export async function loader({ request }: LoaderFunctionArgs) {
  const cacheKey = new URL(request.url).pathname;
  const cachedData: { tags: string[] } = await cache.get(cacheKey);
  if (cachedData) return json(cachedData);

  const { CONTENTFUL_ACCESS_TOKEN, CONTENTFUL_URL, CONTENTFUL_PREVIEW } =
    getEnvVars();

  const allDrinkTagsQuery = /* GraphQL */ `
    query ($preview: Boolean) {
      drinkCollection(preview: $preview) {
        drinks: items {
          tags
        }
      }
    }
  `;

  const queryResponse = await fetchGraphQL(
    CONTENTFUL_URL,
    CONTENTFUL_ACCESS_TOKEN,
    allDrinkTagsQuery,
    {
      preview: CONTENTFUL_PREVIEW === 'true',
    },
  );

  const queryResponseJson: DrinkTagsResponse = await queryResponse.json();

  if (
    queryResponseJson.errors?.length ||
    !queryResponseJson.data.drinkCollection
  ) {
    throw json(queryResponseJson, 500);
  }

  const {
    data: {
      drinkCollection: { drinks: maybeDrinks },
    },
  } = queryResponseJson;

  const drinks = maybeDrinks.filter((drink): drink is Drink => Boolean(drink));
  const uniqueTags = drinks.reduce<Set<string>>((acc, drink) => {
    drink.tags?.forEach((tag) => acc.add(tag));
    return acc;
  }, new Set());

  const loaderData = { tags: Array.from(uniqueTags).sort() };

  await cache.set(cacheKey, loaderData);
  return json(loaderData);
}
