import { data, useSearchParams, useNavigation } from 'react-router';
import { cacheHeader } from 'pretty-cache-header';
import { defaultPageDescription, defaultPageTitle } from '~/core/config';
import { getEnvVars } from '~/utils/env.server';
import { fetchGraphQL } from '~/utils/graphql.server';
import { withPlaceholderImages } from '~/utils/placeholder-images.server';
import { DrinkList } from '~/drinks/drink-list';
import type { AppRouteHandle, Drink, DrinksResponse } from '~/types';
import { NoDrinksFound } from './no-drinks-found';
import { NoSearchTerm } from './no-search-term';
import { SearchForm } from './search-form';
import { Searching } from './searching';
import { createSearchIndex, searchDrinks } from './minisearch.server';
import type { Route } from './+types/route';

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

export async function loader({ request }: Route.LoaderArgs) {
  const q = new URL(request.url).searchParams.get('q');
  if (!q) {
    return data(
      { drinks: [], socialImageUrl: SITE_IMAGE_URL, socialImageAlt: SITE_IMAGE_ALT },
      {
        headers: {
          'Surrogate-Key': 'all',
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

  // Fetch all drinks from Contentful
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
          notes
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

  const allDrinks = maybeDrinks.filter((drink): drink is Drink => Boolean(drink));

  // Search
  const searchIndex = createSearchIndex(allDrinks);
  const slugs = searchDrinks(searchIndex, q);

  if (slugs.length === 0) {
    return { drinks: [], socialImageUrl: SITE_IMAGE_URL, socialImageAlt: SITE_IMAGE_ALT };
  }

  // Filter all drinks by search results
  const drinks = slugs
    .map((slug) => allDrinks.find((drink) => drink.slug === slug))
    .filter((drink): drink is Drink => Boolean(drink));

  const drinksWithPlaceholderImages = await withPlaceholderImages(drinks);

  return {
    drinks: drinksWithPlaceholderImages,
    socialImageUrl: SITE_IMAGE_URL,
    socialImageAlt: SITE_IMAGE_ALT,
  };
}

export const handle: AppRouteHandle = {
  breadcrumb: () => ({ title: 'Search' }),
};

export function meta({ loaderData }: Route.MetaArgs) {
  const { socialImageUrl, socialImageAlt } = loaderData ?? {};

  return [
    { title: 'Search Drinks' },
    {
      name: 'description',
      content: 'Search all drinks by ingredient or description',
    },
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

export default function SearchPage({ loaderData }: Route.ComponentProps) {
  const { drinks } = loaderData;
  const [searchParams] = useSearchParams();
  const q = searchParams.get('q');
  const navigation = useNavigation();
  const futureQ = new URLSearchParams(navigation.location?.search).get('q');
  const isIdle = navigation.state === 'idle';
  const isLoading = navigation.state === 'loading';

  const hasNoSearchTerm = isLoading ? !futureQ : !q;
  const isSearching = isLoading && navigation.location?.pathname === '/search' && futureQ;
  const hasNoResults = isIdle && q && drinks.length === 0;
  const hasResults = isIdle && drinks.length > 0;

  return (
    <>
      <SearchForm initialSearchTerm={q ?? ''} />
      {hasNoSearchTerm && <NoSearchTerm />}
      {isSearching && <Searching />}
      {hasNoResults && <NoDrinksFound />}
      {hasResults && <DrinkList drinks={drinks} />}
    </>
  );
}
