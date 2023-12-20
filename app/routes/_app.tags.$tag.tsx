import { json, type LoaderFunctionArgs } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';
import lowerCase from 'lodash/lowerCase';
import startCase from 'lodash/startCase';
import { getEnvVars } from '~/utils/env.server';
import { mergeMeta } from '~/utils/meta';
import { fetchGraphQL } from '~/utils/graphql.server';
import { cache } from '~/utils/cache.server';
import { withPlaceholderImages } from '~/utils/placeholder-images.server';
import { notFoundMeta } from '~/routes/_app.$';
import { getLoaderDataForHandle } from '~/navigation/breadcrumbs';
import DrinkList from '~/drinks/drink-list';
import type {
  AppRouteHandle,
  Drink,
  DrinksResponse,
  EnhancedDrink,
} from '~/types';

export const loader = async ({ params, request }: LoaderFunctionArgs) => {
  if (!params.tag) throw json('Missing tag', 400);

  const cacheKey = new URL(request.url).pathname;
  const cachedData: { drinks: Array<EnhancedDrink> } =
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
};

export const handle: AppRouteHandle = {
  breadcrumb: (matches) => {
    const data = getLoaderDataForHandle<typeof loader>(
      'routes/_app.tags.$tag',
      matches,
    );
    return {
      title: `${lowerCase(matches.at(-1)?.params.tag)} ( ${
        data.drinks.length
      } )`,
    };
  },
};

export const meta = mergeMeta<typeof loader>(({ data, params }) => {
  if (!data) return notFoundMeta;

  const { tag } = params;

  return [
    { title: `Drinks with ${startCase(tag)}` },
    { name: 'description', content: `All drinks containing ${lowerCase(tag)}` },
  ];
});

export default function TagPage() {
  const { drinks } = useLoaderData<typeof loader>();

  return <DrinkList drinks={drinks} />;
}
