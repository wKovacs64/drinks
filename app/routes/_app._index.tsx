import { data, useLoaderData } from '@remix-run/react';
import type { HeadersFunction } from '@remix-run/node';
import { cacheHeader } from 'pretty-cache-header';
import { DrinkList } from '~/drinks/drink-list';
import { getEnvVars } from '~/utils/env.server';
import { fetchGraphQL } from '~/utils/graphql.server';
import { withPlaceholderImages } from '~/utils/placeholder-images.server';
import type { DrinksResponse, Drink } from '~/types';

const { CONTENTFUL_ACCESS_TOKEN, CONTENTFUL_URL, CONTENTFUL_PREVIEW } = getEnvVars();

export const headers: HeadersFunction = () => {
  return {
    'Cache-Control': cacheHeader({
      maxAge: '10min',
      sMaxage: '1day',
      staleWhileRevalidate: '1week',
    }),
  };
};

export async function loader() {
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

  const drinks = maybeDrinks.filter((drink): drink is Drink => Boolean(drink));
  const drinksWithPlaceholderImages = await withPlaceholderImages(drinks);

  return { drinks: drinksWithPlaceholderImages };
}

export default function HomePage() {
  const { drinks } = useLoaderData<typeof loader>();

  return <DrinkList drinks={drinks} />;
}
