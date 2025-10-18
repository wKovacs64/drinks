import { data } from 'react-router';
import { cacheHeader } from 'pretty-cache-header';
import { defaultPageDescription, defaultPageTitle } from '~/core/config';
import { DrinkList } from '~/drinks/drink-list';
import { getEnvVars } from '~/utils/env.server';
import { fetchGraphQL } from '~/utils/graphql.server';
import { withPlaceholderImages } from '~/utils/placeholder-images.server';
import type { DrinksResponse, Drink } from '~/types';
import type { Route } from './+types/_app._index';

const {
  CONTENTFUL_ACCESS_TOKEN,
  CONTENTFUL_URL,
  CONTENTFUL_PREVIEW,
  SITE_IMAGE_URL,
  SITE_IMAGE_ALT,
} = getEnvVars();

export function headers({ loaderHeaders }: Route.HeadersArgs) {
  return loaderHeaders;
}

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

  return data(
    {
      drinks: drinksWithPlaceholderImages,
      socialImageUrl: SITE_IMAGE_URL,
      socialImageAlt: SITE_IMAGE_ALT,
    },
    {
      headers: {
        'Surrogate-Key': 'all index',
        'Cache-Control': cacheHeader({
          public: true,
          maxAge: '30sec',
          sMaxage: '1yr',
          staleWhileRevalidate: '10min',
          staleIfError: '1day',
        }),
      },
    },
  );
}

export function meta({ loaderData }: Route.MetaArgs) {
  const { socialImageUrl, socialImageAlt } = loaderData ?? {};

  return [
    { title: defaultPageTitle },
    { name: 'description', content: defaultPageDescription },
    { property: 'og:title', content: defaultPageTitle },
    { property: 'og:description', content: defaultPageDescription },
    { property: 'og:image', content: socialImageUrl },
    { property: 'og:image:alt', content: socialImageAlt },
    { name: 'twitter:title', content: defaultPageTitle },
    { name: 'twitter:description', content: defaultPageDescription },
    { name: 'twitter:image', content: socialImageUrl },
    { name: 'twitter:image:alt', content: socialImageAlt },
  ];
}

export default function HomePage({ loaderData }: Route.ComponentProps) {
  const { drinks } = loaderData;

  return <DrinkList drinks={drinks} />;
}
