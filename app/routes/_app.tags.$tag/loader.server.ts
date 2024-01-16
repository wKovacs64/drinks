import {
  json,
  type LoaderFunctionArgs,
  type SerializeFrom,
} from '@remix-run/node';
import { lowerCase } from 'lodash-es';
import { getEnvVars } from '~/utils/env.server';
import { fetchGraphQL } from '~/utils/graphql.server';
import { cache } from '~/utils/cache.server';
import { withPlaceholderImages } from '~/utils/placeholder-images.server';
import type { Drink, DrinksResponse, EnhancedDrink } from '~/types';

export type LoaderData = SerializeFrom<typeof loader>;

export async function loader({ params, request }: LoaderFunctionArgs) {
  if (!params.tag) throw json('Missing tag', 400);

  const cacheKey = new URL(request.url).pathname;
  const cachedData: { drinks: EnhancedDrink[] } =
    await cache.get(cacheKey);
  if (cachedData) return json(cachedData);

  const { CONTENTFUL_ACCESS_TOKEN, CONTENTFUL_URL, CONTENTFUL_PREVIEW } =
    getEnvVars();

  const taggedDrinksQuery = /* GraphQL */ `
    query ($preview: Boolean, $tag: [String]) {
      drinkCollection(
        preview: $preview
        order: [rank_DESC, sys_firstPublishedAt_DESC]
        where: { tags_contains_all: $tag }
      ) {
        drinks: items {
          title
          slug
          image {
            url
          }
          ingredients
          calories
        }
      }
    }
  `;

  const queryResponse = await fetchGraphQL(
    CONTENTFUL_URL,
    CONTENTFUL_ACCESS_TOKEN,
    taggedDrinksQuery,
    {
      preview: CONTENTFUL_PREVIEW === 'true',
      tag: lowerCase(params.tag),
    },
  );

  const queryResponseJson: DrinksResponse = await queryResponse.json();

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

  if (drinks.length === 0) {
    throw json({ message: 'No drinks found' }, 404);
  }

  const drinksWithPlaceholderImages = await withPlaceholderImages(drinks);
  const loaderData = { drinks: drinksWithPlaceholderImages };

  await cache.set(cacheKey, loaderData);
  return json(loaderData);
}
