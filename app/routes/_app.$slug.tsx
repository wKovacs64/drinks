import { data } from 'react-router';
import { cacheHeader } from 'pretty-cache-header';
import { invariantResponse } from '@epic-web/invariant';
import { makeImageUrl } from '~/core/image';
import { getLoaderDataForHandle } from '~/core/utils';
import { Glass } from '~/drinks/glass';
import { DrinkSummary } from '~/drinks/drink-summary';
import { DrinkDetails } from '~/drinks/drink-details';
import { getEnvVars } from '~/utils/env.server';
import { fetchGraphQL } from '~/utils/graphql.server';
import { markdownToHtml } from '~/utils/markdown.server';
import { withPlaceholderImages } from '~/utils/placeholder-images.server';
import type { AppRouteHandle, Drink, DrinksResponse } from '~/types';
import type { Route } from './+types/_app.$slug';

const { CONTENTFUL_ACCESS_TOKEN, CONTENTFUL_URL, CONTENTFUL_PREVIEW } = getEnvVars();

export async function headers() {
  return {
    'Cache-Control': cacheHeader({
      maxAge: '10min',
      sMaxage: '1day',
      staleWhileRevalidate: '1week',
    }),
  };
}

export async function loader({ params }: Route.LoaderArgs) {
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
    throw data(queryResponseJson, { status: 500 });
  }

  const {
    data: {
      drinkCollection: { drinks: maybeDrinks },
    },
  } = queryResponseJson;

  const drinks = maybeDrinks.filter((drink): drink is Drink => Boolean(drink));
  invariantResponse(drinks.length > 0, 'Drink not found', {
    status: 404,
    headers: {
      'Cache-Control': cacheHeader({
        maxAge: '1min',
        sMaxage: '5min',
        mustRevalidate: true,
      }),
    },
  });

  const drinksWithPlaceholderImages = await withPlaceholderImages(drinks);
  const [enhancedDrink] = drinksWithPlaceholderImages;

  if (enhancedDrink.notes) {
    enhancedDrink.notes = markdownToHtml(enhancedDrink.notes);
  }

  return { drink: enhancedDrink };
}

export const handle: AppRouteHandle = {
  breadcrumb: (matches) => {
    const loaderData = getLoaderDataForHandle<typeof loader>('routes/_app.$slug', matches);
    return { title: loaderData?.drink.title ?? 'Not Found' };
  },
};

export function meta({ data: loaderData }: Route.MetaArgs) {
  const { drink } = loaderData;
  const { title, ingredients } = drink;
  const description = ingredients.join(', ');
  const socialImageUrl = makeImageUrl({
    baseImageUrl: drink.image.url,
    width: 1200,
    height: 630,
    fit: 'thumb',
    quality: 50,
    format: 'jpg',
    fl: 'progressive',
  });
  const socialImageAlt = `${title} in a glass`;

  return [
    { title },
    { name: 'description', content: description },
    { property: 'og:title', content: title },
    { property: 'og:description', content: description },
    { property: 'og:image', content: socialImageUrl },
    { property: 'og:image:alt', content: socialImageAlt },
    { name: 'twitter:title', content: title },
    { name: 'twitter:description', content: description },
    { name: 'twitter:image', content: socialImageUrl },
    { name: 'twitter:image:alt', content: socialImageAlt },
  ];
}

export default function DrinkPage({ loaderData }: Route.ComponentProps) {
  const { drink } = loaderData;

  const imageWidths = [320, 400, 420, 480, 640, 800, 840, 960, 1280];
  const imageSizesPerViewport = [
    '(min-width: 1280px) 640px',
    '((min-width: 1024px) and (max-width: 1279px)) 480px',
    '((min-width: 640px) and (max-width: 1023px)) 420px',
    '100vw',
  ];

  return (
    <Glass>
      <DrinkSummary
        className="lg:flex-row"
        drink={drink}
        imageWidths={imageWidths}
        imageSizesPerViewport={imageSizesPerViewport}
        stacked
      />
      <DrinkDetails drink={drink} />
    </Glass>
  );
}
