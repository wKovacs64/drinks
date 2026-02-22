import { data } from 'react-router';
import { cacheHeader } from 'pretty-cache-header';
import { defaultPageDescription, defaultPageTitle } from '#/app/core/config';
import { DrinkList } from '#/app/drinks/drink-list';
import { getPublishedDrinks } from '#/app/models/drink.server';
import { getEnvVars } from '#/app/utils/env.server';
import { withPlaceholderImages } from '#/app/utils/placeholder-images.server';
import type { Route } from './+types/_app._index';

const { SITE_IMAGE_URL, SITE_IMAGE_ALT } = getEnvVars();

export function headers({ loaderHeaders }: Route.HeadersArgs) {
  return loaderHeaders;
}

export async function loader() {
  const drinks = await getPublishedDrinks();
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
