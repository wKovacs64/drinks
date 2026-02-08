import { data } from 'react-router';
import { cacheHeader } from 'pretty-cache-header';
import { defaultPageDescription, defaultPageTitle } from '#/app/core/config';
import { DrinkList } from '#/app/drinks/drink-list';
import { getAllDrinks } from '#/app/models/drink.server';
import { getEnvVars } from '#/app/utils/env.server';
import { withPlaceholderImages } from '#/app/utils/placeholder-images.server';
import type { Drink } from '#/app/types';
import type { Route } from './+types/_app._index';

const { SITE_IMAGE_URL, SITE_IMAGE_ALT } = getEnvVars();

export function headers({ loaderHeaders }: Route.HeadersArgs) {
  return loaderHeaders;
}

export async function loader() {
  const sqliteDrinks = await getAllDrinks();

  const drinks: Drink[] = sqliteDrinks.map((drink) => ({
    title: drink.title,
    slug: drink.slug,
    image: { url: drink.imageUrl },
    ingredients: drink.ingredients,
    calories: drink.calories,
    notes: drink.notes ?? undefined,
    tags: drink.tags,
  }));

  const drinksWithPlaceholderImages = await withPlaceholderImages(drinks);

  return data(
    {
      drinks: drinksWithPlaceholderImages,
      socialImageUrl: SITE_IMAGE_URL,
      socialImageAlt: SITE_IMAGE_ALT,
    },
    {
      headers: {
        'Surrogate-Key': 'all index',
        'Cache-Control': cacheHeader({
          public: true,
          maxAge: '30sec',
          sMaxage: '1yr',
          staleWhileRevalidate: '10min',
          staleIfError: '1day',
        }),
      },
    },
  );
}

export function meta({ loaderData }: Route.MetaArgs) {
  const { socialImageUrl, socialImageAlt } = loaderData ?? {};

  return [
    { title: defaultPageTitle },
    { name: 'description', content: defaultPageDescription },
    { property: 'og:title', content: defaultPageTitle },
    { property: 'og:description', content: defaultPageDescription },
    { property: 'og:image', content: socialImageUrl },
    { property: 'og:image:alt', content: socialImageAlt },
    { name: 'twitter:title', content: defaultPageTitle },
    { name: 'twitter:description', content: defaultPageDescription },
    { name: 'twitter:image', content: socialImageUrl },
    { name: 'twitter:image:alt', content: socialImageAlt },
  ];
}

export default function HomePage({ loaderData }: Route.ComponentProps) {
  const { drinks } = loaderData;

  return <DrinkList drinks={drinks} />;
}
