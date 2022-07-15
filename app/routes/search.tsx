import * as React from 'react';
import { json, type LoaderArgs, type MetaFunction } from '@remix-run/node';
import {
  useLoaderData,
  useSearchParams,
  useTransition,
} from '@remix-run/react';
import { getEnvVars } from '~/utils/env.server';
import { fetchGraphQL } from '~/utils/graphql.server';
import { withPlaceholderImages } from '~/utils/placeholder-images.server';
import Nav from '~/components/nav';
import NavLink from '~/components/nav-link';
import NavDivider from '~/components/nav-divider';
import {
  NoDrinksFound,
  NoSearchTerm,
  SearchForm,
  Searching,
} from '~/components/search';
import DrinkList from '~/components/drink-list';
import type { Drink, DrinksResponse } from '~/types';

export const loader = async ({ request }: LoaderArgs) => {
  const q = new URL(request.url).searchParams.get('q');
  if (!q) {
    return json({ drinks: [] });
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
    return json({ drinks: [] });
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

  const queryResponse = await fetchGraphQL(
    CONTENTFUL_URL,
    CONTENTFUL_ACCESS_TOKEN,
    allDrinksQuery,
    {
      preview: CONTENTFUL_PREVIEW === 'true',
      slugs: hits.map((hit) => hit.slug),
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

  const drinksWithPlaceholderImages = await withPlaceholderImages(drinks);
  const loaderData = { drinks: drinksWithPlaceholderImages };

  return json(loaderData);
};

export const meta: MetaFunction = (metaArgs) => {
  return {
    title: 'Search Drinks',
    description: 'Search all drinks by ingredient or description',
  };
};

export default function SearchPage() {
  const { drinks } = useLoaderData<typeof loader>();
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
  hits: Array<AlgoliaDrinkHit>;
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
  extends Pick<Drink, 'title' | 'slug' | 'ingredients' | 'notes'> {
  createdAt: string;
  objectID: string;
  _highlightResult: {
    title: {
      value: string;
      matchLevel: AlgoliaMatchLevel;
      fullyHighlighted: boolean;
      matchedWords: Array<string>;
    };
    slug: {
      value: string;
      matchLevel: AlgoliaMatchLevel;
      fullyHighlighted: boolean;
      matchedWords: Array<string>;
    };
    ingredients: Array<{
      value: string;
      matchLevel: AlgoliaMatchLevel;
      matchedWords: Array<string>;
    }>;
    createdAt: {
      value: string;
      matchLevel: AlgoliaMatchLevel;
      matchedWords: Array<string>;
    };
    notes: {
      value: string;
      matchLevel: AlgoliaMatchLevel;
      fullyHighlighted: boolean;
      matchedWords: Array<string>;
    };
  };
}

type AlgoliaMatchLevel = 'none' | 'partial' | 'full';
