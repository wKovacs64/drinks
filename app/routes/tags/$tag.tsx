import { json, type LoaderFunction, type MetaFunction } from '@remix-run/node';
import { useLoaderData, useParams } from '@remix-run/react';
import lowerCase from 'lodash/lowerCase';
import startCase from 'lodash/startCase';
import { getEnvVars } from '~/utils/env.server';
import { fetchGraphQL } from '~/utils/graphql.server';
import { cache } from '~/utils/cache.server';
import { withPlaceholderImages } from '~/utils/placeholder-images.server';
import Nav from '~/components/nav';
import NavLink from '~/components/nav-link';
import NavDivider from '~/components/nav-divider';
import DrinkList from '~/components/drink-list';
import type { DrinksResponse, EnhancedDrink } from '~/types';

interface LoaderData {
  drinks: ReadonlyArray<EnhancedDrink>;
}

export const loader: LoaderFunction = async ({ params, request }) => {
  if (!params.tag) throw json('Missing tag', 400);

  const cacheKey = new URL(request.url).pathname;
  const cachedData: LoaderData = await cache.get(cacheKey);
  if (cachedData) return json<LoaderData>(cachedData);

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

  const drinksWithPlaceholderImages = await withPlaceholderImages(drinks);
  const loaderData: LoaderData = { drinks: drinksWithPlaceholderImages };

  await cache.put(cacheKey, loaderData);
  return json<LoaderData>(loaderData);
};

export const meta: MetaFunction = (metaArgs) => {
  const { tag } = metaArgs.params;

  return {
    title: `Drinks with ${startCase(tag)}`,
    description: `All drinks containing ${lowerCase(tag)}`,
  };
};

export default function TagPage() {
  const { drinks } = useLoaderData<LoaderData>();
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
