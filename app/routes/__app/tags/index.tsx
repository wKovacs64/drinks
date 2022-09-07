import { json, type LoaderArgs, type MetaFunction } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';
import kebabCase from 'lodash/kebabCase';
import Nav from '~/navigation/nav';
import NavDivider from '~/navigation/nav-divider';
import NavLink from '~/navigation/nav-link';
import TagLink from '~/tags/tag-link';
import Tag from '~/tags/tag';
import { getEnvVars } from '~/utils/env.server';
import { fetchGraphQL } from '~/utils/graphql.server';
import { cache } from '~/utils/cache.server';
import type { DrinkTagsResponse } from '~/types';

// TODO: remove this workaround once Remix uses esbuild >= 0.14.26
export type LoaderData = Awaited<
  ReturnType<Awaited<ReturnType<typeof loader>>['json']>
>;
// More correct, but Remix (esbuild 0.14.22) doesn't support it yet
// export type LoaderData = ReturnType<typeof useLoaderData<typeof loader>>;

export const loader = async ({ request }: LoaderArgs) => {
  const cacheKey = new URL(request.url).pathname;
  const cachedData: { tags: Array<string> } = await cache.get(cacheKey);
  if (cachedData) return json(cachedData);

  const { CONTENTFUL_ACCESS_TOKEN, CONTENTFUL_URL, CONTENTFUL_PREVIEW } =
    getEnvVars();

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

  const uniqueTags = drinks.reduce<Set<string>>((acc, drink) => {
    drink.tags?.forEach((tag) => acc.add(tag));
    return acc;
  }, new Set());

  const loaderData = { tags: Array.from(uniqueTags).sort() };

  await cache.set(cacheKey, loaderData);
  return json(loaderData);
};

export const meta: MetaFunction = () => {
  return {
    title: 'Ingredient Tags',
    description: 'Discover drinks by ingredient',
  };
};

export default function TagsPage() {
  const { tags } = useLoaderData<typeof loader>();

  return (
    <div>
      <Nav>
        <ul>
          <NavLink to="/">All Drinks</NavLink>
          <NavDivider />
          <li className="inline">Tags</li>
        </ul>
      </Nav>
      <main id="main">
        <TagList tags={tags} />
      </main>
    </div>
  );
}

function TagList({ tags }: { tags: Array<string> }) {
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
