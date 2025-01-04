import { data } from 'react-router';
import { kebabCase } from 'lodash-es';
import { cacheHeader } from 'pretty-cache-header';
import { appTitle, appDescription } from '~/core/config';
import { TagLink } from '~/tags/tag-link';
import { Tag } from '~/tags/tag';
import { getEnvVars } from '~/utils/env.server';
import { fetchGraphQL } from '~/utils/graphql.server';
import type { DrinkTagsResponse, Drink } from '~/types';
import type { Route } from './+types/_app.tags._index';

const {
  CONTENTFUL_ACCESS_TOKEN,
  CONTENTFUL_URL,
  CONTENTFUL_PREVIEW,
  SITE_IMAGE_URL,
  SITE_IMAGE_ALT,
} = getEnvVars();

export function headers() {
  return {
    'Cache-Control': cacheHeader({
      maxAge: '10min',
      sMaxage: '1day',
      staleWhileRevalidate: '1week',
    }),
  };
}

export async function loader() {
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

  return {
    tags: Array.from(uniqueTags).sort(),
    socialImageUrl: SITE_IMAGE_URL,
    socialImageAlt: SITE_IMAGE_ALT,
  };
}

export function meta({ data: loaderData }: Route.MetaArgs) {
  const { socialImageUrl, socialImageAlt } = loaderData;

  return [
    { title: 'Ingredient Tags' },
    { name: 'description', content: 'Discover drinks by ingredient' },
    { property: 'og:title', content: appTitle },
    { property: 'og:description', content: appDescription },
    { property: 'og:image', content: socialImageUrl },
    { property: 'og:image:alt', content: socialImageAlt },
    { name: 'twitter:title', content: appTitle },
    { name: 'twitter:description', content: appDescription },
    { name: 'twitter:image', content: socialImageUrl },
    { name: 'twitter:image:alt', content: socialImageAlt },
  ];
}

export default function TagsPage({ loaderData }: Route.ComponentProps) {
  const { tags } = loaderData;

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
