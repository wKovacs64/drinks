import * as React from 'react';
import {
  json,
  type HeadersFunction,
  type LoaderFunction,
  type MetaFunction,
} from '@remix-run/node';
import {
  useLoaderData,
  useSearchParams,
  useTransition,
} from '@remix-run/react';
import { getEnvVars } from '~/utils/env.server';
import { fetchGraphQL } from '~/utils/graphql.server';
import { cache } from '~/utils/cache.server';
import { withPlaceholderImages } from '~/utils/placeholder-images.server';
import Nav from '~/components/nav';
import type { Drink, DrinksResponse, EnhancedDrink } from '~/types';
import NavLink from '~/components/nav-link';
import NavDivider from '~/components/nav-divider';
import {
  NoDrinksFound,
  NoSearchTerm,
  SearchForm,
  Searching,
} from '~/components/search';
import DrinkList from '~/components/drink-list';

interface LoaderData {
  drinks: ReadonlyArray<EnhancedDrink>;
}

export const loader: LoaderFunction = async ({ context, request }) => {
  const q = new URL(request.url).searchParams.get('q');
  if (!q) {
    return json<LoaderData>(
      { drinks: [] },
      {
        headers: {
          'Cache-Control': 'max-age=0, s-maxage=86400',
        },
      },
    );
  }

  const {
    ALGOLIA_APP_ID,
    ALGOLIA_SEARCH_KEY,
    ALGOLIA_INDEX_NAME,
    CONTENTFUL_ACCESS_TOKEN,
    CONTENTFUL_URL,
    CONTENTFUL_PREVIEW,
  } = getEnvVars();

  // query Algolia for the search results based on q
  const algoliaSearchResponse = await fetch(
    `https://${ALGOLIA_APP_ID}-dsn.algolia.net/1/indexes/${ALGOLIA_INDEX_NAME}/query`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Algolia-Application-Id': ALGOLIA_APP_ID,
        'X-Algolia-API-Key': ALGOLIA_SEARCH_KEY,
      },
      body: JSON.stringify({
        params: `query=${encodeURIComponent(q)}`,
      }),
    },
  );

  if (!algoliaSearchResponse.ok) {
    const errMessage: string = (await algoliaSearchResponse.json()).message;
    throw json({ message: `Search failed: ${errMessage}` }, { status: 500 });
  }

  const { hits } =
    (await algoliaSearchResponse.json()) as AlgoliaSearchResponse;

  if (hits.length === 0) {
    return json<LoaderData>(
      { drinks: [] },
      {
        headers: {
          'Cache-Control': 'max-age=0, s-maxage=300',
        },
      },
    );
  }

  // query Contentful for drinks matching slugs in Algolia results
  const allDrinksQuery = /* GraphQL */ `
    query ($preview: Boolean, $slugs: [String]) {
      drinkCollection(
        preview: $preview
        order: [rank_DESC, sys_firstPublishedAt_DESC]
        where: { slug_in: $slugs }
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

  try {
    const queryResponse = await fetchGraphQL(
      CONTENTFUL_URL,
      CONTENTFUL_ACCESS_TOKEN,
      allDrinksQuery,
      {
        preview: CONTENTFUL_PREVIEW === 'true',
        slugs: hits.map((hit) => hit.objectID),
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
        drinkCollection: { drinks },
      },
    } = queryResponseJson;

    const drinksWithPlaceholderImages = await withPlaceholderImages(
      drinks,
      cache,
    );

    return json<LoaderData>(
      { drinks: drinksWithPlaceholderImages },
      {
        headers: {
          'Cache-Control': 'max-age=0, s-maxage=300',
        },
      },
    );
  } catch (err: unknown) {
    if (err instanceof Response) throw err;
    if (err instanceof Error) throw json(err.message, 500);
    throw json('Unknown failure', 500);
  }
};

export const headers: HeadersFunction = ({ loaderHeaders }) => {
  return {
    'Cache-Control': loaderHeaders.get('Cache-Control') || '',
  };
};

export const meta: MetaFunction = (metaArgs) => {
  return {
    title: 'Search Drinks',
    description: 'Search all drinks by ingredient or description',
  };
};

export default function SearchPage() {
  const { drinks } = useLoaderData<LoaderData>();
  const [searchParams] = useSearchParams();
  const q = searchParams.get('q');
  const transition = useTransition();

  const isIdle = transition.state === 'idle' && !q;
  const isSearching = transition.state === 'submitting';
  const hasNoResults = transition.state === 'idle' && q && drinks.length === 0;
  const hasResults = transition.state === 'idle' && drinks.length > 0;

  return (
    <div>
      <Nav>
        <ul>
          <NavLink to="/">All Drinks</NavLink>
          <NavDivider />
          {q ? (
            <React.Fragment>
              <NavLink to="/search">Search</NavLink>
              <NavDivider />
              <li className="inline">"{q}"</li>
            </React.Fragment>
          ) : (
            <li className="inline">Search</li>
          )}
        </ul>
      </Nav>
      <main id="main">
        <SearchForm initialSearchTerm={q ?? ''} />
        {isIdle && <NoSearchTerm />}
        {isSearching && <Searching />}
        {hasNoResults && <NoDrinksFound />}
        {hasResults && <DrinkList drinks={drinks} />}
      </main>
    </div>
  );
}

interface AlgoliaSearchResponse {
  hits: ReadonlyArray<AlgoliaDrinkHit>;
  page: number;
  nbHits: number;
  nbPages: number;
  hitsPerPage: number;
  processingTimeMS: number;
  query: string;
  parsed_query: string;
  params: string;
}

interface AlgoliaDrinkHit
  extends Pick<Drink, 'title' | 'ingredients' | 'notes'> {
  createdAt: string;
  imagePreviewSrc: string;
  objectID: 'string';
  _highlightResult: {
    title: {
      value: string;
      matchLevel: AlgoliaMatchLevel;
      fullyHighlighted: boolean;
      matchedWords: ReadonlyArray<string>;
    };
    ingredients: ReadonlyArray<{
      value: string;
      matchLevel: AlgoliaMatchLevel;
      matchedWords: ReadonlyArray<string>;
    }>;
    createdAt: {
      value: string;
      matchLevel: AlgoliaMatchLevel;
      matchedWords: ReadonlyArray<string>;
    };
    notes: {
      value: string;
      matchLevel: AlgoliaMatchLevel;
      fullyHighlighted: boolean;
      matchedWords: ReadonlyArray<string>;
    };
    imagePreviewSrc: {
      value: string;
      matchLevel: AlgoliaMatchLevel;
      matchedWords: ReadonlyArray<string>;
    };
  };
}

type AlgoliaMatchLevel = 'none' | 'partial' | 'full';
