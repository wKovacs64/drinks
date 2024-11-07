import { data, useLoaderData } from '@remix-run/react';
import { lowerCase, startCase } from 'lodash-es';
import type { HeadersFunction, LoaderFunctionArgs } from '@remix-run/node';
import { cacheHeader } from 'pretty-cache-header';
import { invariant, invariantResponse } from '@epic-web/invariant';
import { mergeMeta } from '~/utils/meta';
import { notFoundMeta } from '~/routes/_app.$';
import { getLoaderDataForHandle } from '~/navigation/breadcrumbs';
import { DrinkList } from '~/drinks/drink-list';
import { getEnvVars } from '~/utils/env.server';
import { fetchGraphQL } from '~/utils/graphql.server';
import { withPlaceholderImages } from '~/utils/placeholder-images.server';
import type { AppRouteHandle, Drink, DrinksResponse } from '~/types';

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

export async function loader({ params }: LoaderFunctionArgs) {
  invariant(params.tag, 'tag route parameter was missing');

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

  return { drinks: drinksWithPlaceholderImages };
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

export const meta = mergeMeta<typeof loader>(({ data: loaderData, params }) => {
  if (!loaderData) return notFoundMeta;

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
