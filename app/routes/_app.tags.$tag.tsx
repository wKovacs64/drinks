import { json, type LoaderArgs } from '@remix-run/node';
import { useLoaderData, useParams } from '@remix-run/react';
import lowerCase from 'lodash/lowerCase.js';
import startCase from 'lodash/startCase.js';
import { getEnvVars } from '~/utils/env.server.ts';
import { mergeMeta } from '~/utils/meta.ts';
import { fetchGraphQL } from '~/utils/graphql.server.ts';
import { cache } from '~/utils/cache.server.ts';
import { withPlaceholderImages } from '~/utils/placeholder-images.server.ts';
import { notFoundMeta } from '~/routes/_app.$.tsx';
import Nav from '~/navigation/nav.tsx';
import NavLink from '~/navigation/nav-link.tsx';
import NavDivider from '~/navigation/nav-divider.tsx';
import DrinkList from '~/drinks/drink-list.tsx';
import type { DrinksResponse, EnhancedDrink } from '~/types.ts';

export const loader = async ({ params, request }: LoaderArgs) => {
  if (!params.tag) throw json('Missing tag', 400);

  const cacheKey = new URL(request.url).pathname;
  const cachedData: { drinks: Array<EnhancedDrink> } = await cache.get(
    cacheKey,
  );
  if (cachedData) return json(cachedData);

  const { CONTENTFUL_ACCESS_TOKEN, CONTENTFUL_URL, CONTENTFUL_PREVIEW } =
    getEnvVars();

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

  if (drinks.length === 0) {
    throw json({ message: 'No drinks found' }, 404);
  }

  const drinksWithPlaceholderImages = await withPlaceholderImages(drinks);
  const loaderData = { drinks: drinksWithPlaceholderImages };

  await cache.set(cacheKey, loaderData);
  return json(loaderData);
};

export const meta = mergeMeta<typeof loader>(({ data, params }) => {
  if (!data) return notFoundMeta;

  const { tag } = params;

  return [
    { title: `Drinks with ${startCase(tag)}` },
    { name: 'description', content: `All drinks containing ${lowerCase(tag)}` },
  ];
});

export default function TagPage() {
  const { drinks } = useLoaderData<typeof loader>();
  const { tag } = useParams();
  const totalCount = drinks.length;

  return (
    <div>
      <Nav>
        <ul>
          <NavLink to="/">All Drinks</NavLink>
          <NavDivider />
          <NavLink to="/tags">Tags</NavLink>
          <NavDivider />
          <li className="inline">{lowerCase(tag)}</li>
          <li className="ml-2 inline">( {totalCount} )</li>
        </ul>
      </Nav>
      <main id="main">
        <DrinkList drinks={drinks} />
      </main>
    </div>
  );
}
