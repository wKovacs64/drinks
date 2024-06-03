import { json, type LoaderFunctionArgs, type SerializeFrom } from '@remix-run/node';
import { getEnvVars } from '~/utils/env.server';
import { fetchGraphQL } from '~/utils/graphql.server';
import { cache } from '~/utils/cache.server';
import { withPlaceholderImages } from '~/utils/placeholder-images.server';
import { markdownToHtml } from '~/utils/markdown.server';
import type { Drink, DrinksResponse, EnhancedDrink } from '~/types';

export type LoaderData = SerializeFrom<typeof loader>;

export async function loader({ params, request }: LoaderFunctionArgs) {
  if (!params.slug) throw json('Missing slug', 400);

  const cacheKey = new URL(request.url).pathname;
  const cachedData: { drink: EnhancedDrink } = await cache.get(cacheKey);
  if (cachedData) return json(cachedData);

  const { CONTENTFUL_ACCESS_TOKEN, CONTENTFUL_URL, CONTENTFUL_PREVIEW } = getEnvVars();

  const drinkQuery = /* GraphQL */ `
    query ($preview: Boolean, $slug: String) {
      drinkCollection(preview: $preview, limit: 1, where: { slug: $slug }) {
        drinks: items {
          title
          slug
          image {
            url
          }
          ingredients
          calories
          notes
          tags
        }
      }
    }
  `;

  const queryResponse = await fetchGraphQL(CONTENTFUL_URL, CONTENTFUL_ACCESS_TOKEN, drinkQuery, {
    preview: CONTENTFUL_PREVIEW === 'true',
    slug: params.slug,
  });

  const queryResponseJson: DrinksResponse = await queryResponse.json();

  if (queryResponseJson.errors?.length || !queryResponseJson.data.drinkCollection) {
    throw json(queryResponseJson, 500);
  }

  const {
    data: {
      drinkCollection: { drinks: maybeDrinks },
    },
  } = queryResponseJson;

  const drinks = maybeDrinks.filter((drink): drink is Drink => Boolean(drink));

  if (drinks.length === 0) {
    throw json({ message: 'Drink not found' }, 404);
  }

  const drinksWithPlaceholderImages = await withPlaceholderImages(drinks);
  const [enhancedDrink] = drinksWithPlaceholderImages;

  if (enhancedDrink.notes) {
    enhancedDrink.notes = markdownToHtml(enhancedDrink.notes);
  }

  const loaderData = { drink: enhancedDrink };

  await cache.set(cacheKey, loaderData);
  return json(loaderData);
}
