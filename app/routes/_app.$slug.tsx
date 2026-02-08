import { data } from 'react-router';
import { cacheHeader } from 'pretty-cache-header';
import { invariantResponse } from '@epic-web/invariant';
import { transformUrl } from 'unpic';
import { getLoaderDataForHandle } from '#/app/core/utils';
import { Glass } from '#/app/drinks/glass';
import { DrinkSummary } from '#/app/drinks/drink-summary';
import { DrinkDetails } from '#/app/drinks/drink-details';
import { getDrinkBySlug } from '#/app/models/drink.server';
import { markdownToHtml } from '#/app/utils/markdown.server';
import { withPlaceholderImages } from '#/app/utils/placeholder-images.server';
import type { AppRouteHandle, Drink } from '#/app/types';
import type { Route } from './+types/_app.$slug';

export function headers({ loaderHeaders }: Route.HeadersArgs) {
  return loaderHeaders;
}

export async function loader({ params }: Route.LoaderArgs) {
  const sqliteDrink = await getDrinkBySlug(params.slug ?? '');

  invariantResponse(sqliteDrink, 'Drink not found', {
    status: 404,
    headers: {
      'Surrogate-Key': 'all',
      'Cache-Control': cacheHeader({
        public: true,
        maxAge: '30sec',
        sMaxage: '5min',
        mustRevalidate: true,
      }),
    },
  });

  // Transform SQLite drink to the format expected by withPlaceholderImages
  const drink: Drink = {
    title: sqliteDrink.title,
    slug: sqliteDrink.slug,
    image: { url: sqliteDrink.imageUrl },
    ingredients: sqliteDrink.ingredients,
    calories: sqliteDrink.calories,
    notes: sqliteDrink.notes ?? undefined,
    tags: sqliteDrink.tags,
  };

  const drinksWithPlaceholderImages = await withPlaceholderImages([drink]);
  const [enhancedDrink] = drinksWithPlaceholderImages;

  if (enhancedDrink.notes) {
    enhancedDrink.notes = markdownToHtml(enhancedDrink.notes);
  }

  return data(
    { drink: enhancedDrink },
    {
      headers: {
        'Surrogate-Key': `all ${enhancedDrink.slug}`,
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

export const handle: AppRouteHandle = {
  breadcrumb: (matches) => {
    const loaderData = getLoaderDataForHandle<Route.ComponentProps['loaderData']>(
      'routes/_app.$slug',
      matches,
    );
    return { title: loaderData?.drink.title ?? 'Not Found' };
  },
};

export function meta({ loaderData }: Route.MetaArgs) {
  const { drink } = loaderData ?? {};
  if (!drink) return [];
  const { title, ingredients } = drink;
  const description = ingredients.join(', ');
  const socialImageUrl = transformUrl({
    url: drink.image.url,
    width: 1200,
    height: 630,
    quality: 50,
    format: 'jpg',
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

  return (
    <Glass>
      <DrinkSummary
        className="lg:flex-row"
        drink={drink}
        // 800 and up are for high density displays (doubling the base image sizes)
        breakpoints={[320, 400, 420, 480, 640, 800, 840, 960, 1280]}
        sizes={[
          '(min-width: 1280px) 640px', // not stacked
          '((min-width: 1024px) and (max-width: 1279px)) 480px', // not stacked
          '((min-width: 640px) and (max-width: 1023px)) 420px', //stacked
          '100vw', // stacked, no padding
        ].join(', ')}
        stacked
        priority
      />
      <DrinkDetails drink={drink} />
    </Glass>
  );
}
