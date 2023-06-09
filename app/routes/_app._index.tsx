import { json, type LoaderArgs, type SerializeFrom } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';
import { getEnvVars } from '~/utils/env.server.ts';
import { fetchGraphQL } from '~/utils/graphql.server.ts';
import { cache } from '~/utils/cache.server.ts';
import { withPlaceholderImages } from '~/utils/placeholder-images.server.ts';
import Nav from '~/navigation/nav.tsx';
import DrinkList from '~/drinks/drink-list.tsx';
import type { DrinksResponse, EnhancedDrink } from '~/types.ts';

export type LoaderData = SerializeFrom<typeof loader>;

export const loader = async ({ request }: LoaderArgs) => {
  const cacheKey = new URL(request.url).pathname;
  const cachedData: { drinks: Array<EnhancedDrink> } = await cache.get(
    cacheKey,
  );
  if (cachedData) return json(cachedData);

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

  const drinksWithPlaceholderImages = await withPlaceholderImages(drinks);
  const loaderData = { drinks: drinksWithPlaceholderImages };

  await cache.set(cacheKey, loaderData);
  return json(loaderData);
};

export default function HomePage() {
  const { drinks } = useLoaderData<typeof loader>();

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
