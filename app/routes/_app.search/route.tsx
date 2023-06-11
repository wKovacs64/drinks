import * as React from 'react';
import { json, type LoaderArgs } from '@remix-run/node';
import {
  useLoaderData,
  useSearchParams,
  useNavigation,
} from '@remix-run/react';
import { getEnvVars } from '~/utils/env.server.ts';
import { mergeMeta } from '~/utils/meta.ts';
import { fetchGraphQL } from '~/utils/graphql.server.ts';
import { withPlaceholderImages } from '~/utils/placeholder-images.server.ts';
import Nav from '~/navigation/nav.tsx';
import NavLink from '~/navigation/nav-link.tsx';
import NavDivider from '~/navigation/nav-divider.tsx';
import DrinkList from '~/drinks/drink-list.tsx';
import type { Drink, DrinksResponse } from '~/types.ts';
import NoDrinksFound from './no-drinks-found.tsx';
import NoSearchTerm from './no-search-term.tsx';
import SearchForm from './search-form.tsx';
import Searching from './searching.tsx';
import { drinksIndex } from './algolia.server.ts';

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
      drinkCollection: { drinks },
    },
  } = queryResponseJson;

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

  const isIdle = navigation.state === 'idle' && !q;
  const isSearching = navigation.state === 'loading';
  const hasNoResults = navigation.state === 'idle' && q && drinks.length === 0;
  const hasResults = navigation.state === 'idle' && drinks.length > 0;

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
