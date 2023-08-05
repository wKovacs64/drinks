import * as React from 'react';
import { json, type LoaderArgs } from '@remix-run/node';
import {
  useLoaderData,
  useSearchParams,
  useNavigation,
} from '@remix-run/react';
import { getEnvVars } from '~/utils/env.server';
import { mergeMeta } from '~/utils/meta';
import { fetchGraphQL } from '~/utils/graphql.server';
import { withPlaceholderImages } from '~/utils/placeholder-images.server';
import Nav from '~/navigation/nav';
import NavLink from '~/navigation/nav-link';
import NavDivider from '~/navigation/nav-divider';
import DrinkList from '~/drinks/drink-list';
import type { Drink, DrinksResponse } from '~/types';
import NoDrinksFound from './no-drinks-found';
import NoSearchTerm from './no-search-term';
import SearchForm from './search-form';
import Searching from './searching';
import { drinksIndex } from './algolia.server';

export const loader = async ({ request }: LoaderArgs) => {
  const q = new URL(request.url).searchParams.get('q');
  if (!q) {
    return json({ drinks: [] });
  }

  const { CONTENTFUL_ACCESS_TOKEN, CONTENTFUL_URL, CONTENTFUL_PREVIEW } =
    getEnvVars();

  // query Algolia for the search results based on q
  const hits = [];
  try {
    hits.push(...(await drinksIndex.search<AlgoliaDrinkHit>(q)).hits);
  } catch (err) {
    const errMessage = err instanceof Error ? err.message : 'unknown reason';
    throw json({ message: `Search failed: ${errMessage}` }, { status: 500 });
  }

  if (hits.length === 0) {
    return json({ drinks: [] });
  }

  const slugs = hits.map((hit) => hit.slug);

  // query Contentful for drinks matching slugs in Algolia results
  const allDrinksQuery = /* GraphQL */ `
    query ($preview: Boolean, $slugs: [String]) {
      drinkCollection(preview: $preview, where: { slug_in: $slugs }) {
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
      slugs,
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
  // sort results in the same order as slugs returned from Algolia
  drinks.sort((a, b) => slugs.indexOf(a.slug) - slugs.indexOf(b.slug));

  const drinksWithPlaceholderImages = await withPlaceholderImages(drinks);
  const loaderData = { drinks: drinksWithPlaceholderImages };

  return json(loaderData);
};

export const meta = mergeMeta<typeof loader>(() => {
  return [
    { title: 'Search Drinks' },
    {
      name: 'description',
      content: 'Search all drinks by ingredient or description',
    },
  ];
});

export default function SearchPage() {
  const { drinks } = useLoaderData<typeof loader>();
  const [searchParams] = useSearchParams();
  const q = searchParams.get('q');
  const navigation = useNavigation();
  const futureQ = new URLSearchParams(navigation.location?.search).get('q');
  const isIdle = navigation.state === 'idle';
  const isLoading = navigation.state === 'loading';

  const hasNoSearchTerm = isLoading ? !futureQ : !q;
  const isSearching =
    isLoading && navigation.location?.pathname === '/search' && futureQ;
  const hasNoResults = isIdle && q && drinks.length === 0;
  const hasResults = isIdle && drinks.length > 0;

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
        {hasNoSearchTerm && <NoSearchTerm />}
        {isSearching && <Searching />}
        {hasNoResults && <NoDrinksFound />}
        {hasResults && <DrinkList drinks={drinks} />}
      </main>
    </div>
  );
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
