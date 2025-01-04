import { data } from 'react-router';
import { lowerCase, startCase } from 'lodash-es';
import { cacheHeader } from 'pretty-cache-header';
import { invariantResponse } from '@epic-web/invariant';
import { defaultPageDescription, defaultPageTitle } from '~/core/config';
import { getLoaderDataForHandle } from '~/core/utils';
import { DrinkList } from '~/drinks/drink-list';
import { getEnvVars } from '~/utils/env.server';
import { fetchGraphQL } from '~/utils/graphql.server';
import { withPlaceholderImages } from '~/utils/placeholder-images.server';
import type { AppRouteHandle, Drink, DrinksResponse } from '~/types';
import type { Route } from './+types/_app.tags.$tag';

const {
  CONTENTFUL_ACCESS_TOKEN,
  CONTENTFUL_URL,
  CONTENTFUL_PREVIEW,
  SITE_IMAGE_URL,
  SITE_IMAGE_ALT,
} = getEnvVars();

export function headers() {
  return {
    'Cache-Control': cacheHeader({
      maxAge: '10min',
      sMaxage: '1day',
      staleWhileRevalidate: '1week',
    }),
  };
}

export async function loader({ params }: Route.LoaderArgs) {
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

  if (queryResponseJson.errors?.length || !queryResponseJson.data.drinkCollection) {
    throw data(queryResponseJson, { status: 500 });
  }

  const {
    data: {
      drinkCollection: { drinks: maybeDrinks },
    },
  } = queryResponseJson;

  const drinks = maybeDrinks.filter((drink): drink is Drink => Boolean(drink));
  invariantResponse(drinks.length, 'No drinks found', {
    status: 404,
    headers: {
      'Cache-Control': cacheHeader({
        maxAge: '1min',
        sMaxage: '5min',
        mustRevalidate: true,
      }),
    },
  });

  const drinksWithPlaceholderImages = await withPlaceholderImages(drinks);

  return {
    drinks: drinksWithPlaceholderImages,
    socialImageUrl: SITE_IMAGE_URL,
    socialImageAlt: SITE_IMAGE_ALT,
  };
}

export const handle: AppRouteHandle = {
  breadcrumb: (matches) => {
    const loaderData = getLoaderDataForHandle<typeof loader>('routes/_app.tags.$tag', matches);
    return {
      title: loaderData ? (
        <div className="inline-flex gap-2">
          <span>{lowerCase(matches.at(-1)?.params.tag)}</span>
          <span>( {loaderData.drinks.length} )</span>
        </div>
      ) : (
        'Not Found'
      ),
    };
  },
};

export function meta({ data: loaderData, params }: Route.MetaArgs) {
  const { socialImageUrl, socialImageAlt } = loaderData;
  const { tag } = params;

  return [
    { title: `Drinks with ${startCase(tag)}` },
    { name: 'description', content: `All drinks containing ${lowerCase(tag)}` },
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

export default function TagPage({ loaderData }: Route.ComponentProps) {
  const { drinks } = loaderData;

  return <DrinkList drinks={drinks} />;
}
