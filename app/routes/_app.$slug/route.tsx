import { useLoaderData } from '@remix-run/react';
import type { HeadersFunction } from '@remix-run/node';
import { cacheHeader } from 'pretty-cache-header';
import { mergeMeta } from '~/utils/meta';
import { makeImageUrl } from '~/core/image';
import { notFoundMeta } from '~/routes/_app.$';
import { getLoaderDataForHandle } from '~/navigation/breadcrumbs';
import Glass from '~/drinks/glass';
import DrinkSummary from '~/drinks/drink-summary';
import DrinkDetails from '~/drinks/drink-details';
import type { AppRouteHandle } from '~/types';
import { loader } from './loader.server';

export const headers: HeadersFunction = () => {
  return {
    'Cache-Control': cacheHeader({
      maxAge: '10min',
      sMaxage: '1day',
      staleWhileRevalidate: '1week',
    }),
  };
};

export { loader };

export const handle: AppRouteHandle = {
  breadcrumb: (matches) => {
    const data = getLoaderDataForHandle<typeof loader>('routes/_app.$slug', matches);
    return { title: data?.drink.title ?? 'Not Found' };
  },
};

export const meta = mergeMeta<typeof loader>(({ data }) => {
  if (!data) return notFoundMeta;

  const { drink } = data;
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
});

export default function DrinkPage() {
  const { drink } = useLoaderData<typeof loader>();

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
