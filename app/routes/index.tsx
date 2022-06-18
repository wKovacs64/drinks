import {
  json,
  type HeadersFunction,
  type LoaderFunction,
} from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';
import { getEnvVars } from '~/utils/env.server';
import { fetchGraphQL } from '~/utils/graphql.server';
import { cache } from '~/utils/cache.server';
import { withPlaceholderImages } from '~/utils/placeholder-images.server';
import Nav from '~/components/nav';
import DrinkList from '~/components/drink-list';
import type { DrinksResponse, EnhancedDrink } from '~/types';

interface LoaderData {
  drinks: ReadonlyArray<EnhancedDrink>;
}

export const loader: LoaderFunction = async ({ request }) => {
  const cacheKey = new URL(request.url).pathname;
  const cachedData = await cache.get(cacheKey);
  if (cachedData) {
    try {
      const cachedDrinks: ReadonlyArray<EnhancedDrink> = JSON.parse(cachedData);
      return success({ drinks: cachedDrinks });
    } catch {
      // noop, cache failures shouldn't break the app
    }
  }

  const { CONTENTFUL_ACCESS_TOKEN, CONTENTFUL_URL, CONTENTFUL_PREVIEW } =
    getEnvVars();

  const allDrinksQuery = /* GraphQL */ `
    query ($preview: Boolean) {
      drinkCollection(
        preview: $preview
        order: [rank_DESC, sys_firstPublishedAt_DESC]
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

  try {
    await cache.put(cacheKey, JSON.stringify(drinksWithPlaceholderImages));
  } catch {
    // noop, cache failures shouldn't break the app
  }

  return success({ drinks: drinksWithPlaceholderImages });
};

function success(data: LoaderData) {
  return json<LoaderData>(data, {
    headers: {
      'Cache-Control': 'max-age=0, s-maxage=300',
    },
  });
}

export const headers: HeadersFunction = ({ loaderHeaders }) => {
  return {
    'Cache-Control': loaderHeaders.get('Cache-Control') || '',
  };
};

export default function HomePage() {
  const { drinks } = useLoaderData<LoaderData>();

  return (
    <div>
      <Nav>
        <ul>
          <li>All Drinks</li>
        </ul>
      </Nav>
      <main id="main">
        <DrinkList drinks={drinks} />
      </main>
    </div>
  );
}
