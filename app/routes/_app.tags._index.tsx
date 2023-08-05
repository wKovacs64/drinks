import { json, type LoaderArgs, type SerializeFrom } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';
import kebabCase from 'lodash/kebabCase';
import Nav from '~/navigation/nav';
import NavDivider from '~/navigation/nav-divider';
import NavLink from '~/navigation/nav-link';
import TagLink from '~/tags/tag-link';
import Tag from '~/tags/tag';
import { getEnvVars } from '~/utils/env.server';
import { mergeMeta } from '~/utils/meta';
import { fetchGraphQL } from '~/utils/graphql.server';
import { cache } from '~/utils/cache.server';
import type { Drink, DrinkTagsResponse } from '~/types';

export type LoaderData = SerializeFrom<typeof loader>;

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
      drinkCollection: { drinks: maybeDrinks },
    },
  } = queryResponseJson;

  const drinks = maybeDrinks.filter((drink): drink is Drink => Boolean(drink));
  const uniqueTags = drinks.reduce<Set<string>>((acc, drink) => {
    drink.tags?.forEach((tag) => acc.add(tag));
    return acc;
  }, new Set());

  const loaderData = { tags: Array.from(uniqueTags).sort() };

  await cache.set(cacheKey, loaderData);
  return json(loaderData);
};

export const meta = mergeMeta<typeof loader>(() => {
  return [
    { title: 'Ingredient Tags' },
    { name: 'description', content: 'Discover drinks by ingredient' },
  ];
});

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
