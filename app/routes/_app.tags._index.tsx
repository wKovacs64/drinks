import { data, useLoaderData } from '@remix-run/react';
import { kebabCase } from 'lodash-es';
import type { HeadersFunction } from '@remix-run/node';
import { cacheHeader } from 'pretty-cache-header';
import TagLink from '~/tags/tag-link';
import Tag from '~/tags/tag';
import { mergeMeta } from '~/utils/meta';
import { getEnvVars } from '~/utils/env.server';
import { fetchGraphQL } from '~/utils/graphql.server';
import type { DrinkTagsResponse, Drink } from '~/types';

export const headers: HeadersFunction = () => {
  return {
    'Cache-Control': cacheHeader({
      maxAge: '10min',
      sMaxage: '1day',
      staleWhileRevalidate: '1week',
    }),
  };
};

export async function loader() {
  const { CONTENTFUL_ACCESS_TOKEN, CONTENTFUL_URL, CONTENTFUL_PREVIEW } = getEnvVars();

  const allDrinkTagsQuery = /* GraphQL */ `
    query ($preview: Boolean) {
      drinkCollection(preview: $preview) {
        drinks: items {
          tags
        }
      }
    }
  `;

  const queryResponse = await fetchGraphQL(
    CONTENTFUL_URL,
    CONTENTFUL_ACCESS_TOKEN,
    allDrinkTagsQuery,
    {
      preview: CONTENTFUL_PREVIEW === 'true',
    },
  );

  const queryResponseJson: DrinkTagsResponse = await queryResponse.json();

  if (queryResponseJson.errors?.length || !queryResponseJson.data.drinkCollection) {
    throw data(queryResponseJson, { status: 500 });
  }

  const {
    data: {
      drinkCollection: { drinks: maybeDrinks },
    },
  } = queryResponseJson;

  const drinks = maybeDrinks.filter((drink): drink is Drink => Boolean(drink));
  const uniqueTags = drinks.reduce<Set<string>>((acc, drink) => {
    drink.tags?.forEach((tag) => acc.add(tag));
    return acc;
  }, new Set());

  return { tags: Array.from(uniqueTags).sort() };
}

export const meta = mergeMeta<typeof loader>(() => {
  return [
    { title: 'Ingredient Tags' },
    { name: 'description', content: 'Discover drinks by ingredient' },
  ];
});

export default function TagsPage() {
  const { tags } = useLoaderData<typeof loader>();

  return (
    <div
      // TODO: this needs work, particularly wrt horizontal margins
      className="mx-4 grid gap-4 sm:mx-0 sm:gap-8 lg:grid-cols-2 xl:grid-cols-3"
    >
      {tags.map((tag) => (
        <TagLink to={`/tags/${kebabCase(tag)}`} key={tag}>
          <Tag className="p-4 text-2xl lg:p-6 lg:text-4xl">{tag}</Tag>
        </TagLink>
      ))}
    </div>
  );
}
