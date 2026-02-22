import { data } from 'react-router';
import { lowerCase, startCase } from 'lodash-es';
import { cacheHeader } from 'pretty-cache-header';
import { invariantResponse } from '@epic-web/invariant';
import { defaultPageDescription, defaultPageTitle } from '#/app/core/config';
import { getLoaderDataForHandle } from '#/app/core/utils';
import { DrinkList } from '#/app/drinks/drink-list';
import { getDrinksByTag } from '#/app/models/drink.server';
import { getSurrogateKeyForTag } from '#/app/tags/utils';
import { getEnvVars } from '#/app/utils/env.server';
import { withPlaceholderImages } from '#/app/utils/placeholder-images.server';
import type { AppRouteHandle } from '#/app/types';
import type { Route } from './+types/_app.tags.$tag';

const { SITE_IMAGE_URL, SITE_IMAGE_ALT } = getEnvVars();

export function headers({ loaderHeaders }: Route.HeadersArgs) {
  return loaderHeaders;
}

export async function loader({ params }: Route.LoaderArgs) {
  const tagToSearch = lowerCase(params.tag);
  const drinks = await getDrinksByTag(tagToSearch);

  invariantResponse(drinks.length, 'No drinks found', {
    status: 404,
    headers: {
      'Surrogate-Key': 'all',
      'Cache-Control': cacheHeader({
        public: true,
        maxAge: '30sec',
        sMaxage: '1min',
        mustRevalidate: true,
      }),
    },
  });

  const drinksWithPlaceholderImages = await withPlaceholderImages(drinks);

  return data(
    {
      drinks: drinksWithPlaceholderImages,
      socialImageUrl: SITE_IMAGE_URL,
      socialImageAlt: SITE_IMAGE_ALT,
    },
    {
      headers: {
        'Surrogate-Key': `all tags ${getSurrogateKeyForTag(params.tag)}`,
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
      'routes/_app.tags.$tag',
      matches,
    );
    return {
      title: loaderData ? (
        <div className="inline-flex gap-2">
          <span>{lowerCase(matches.at(-1)?.params.tag)}</span>
          <span>( {loaderData.drinks.length} )</span>
        </div>
      ) : (
        'Not Found'
      ),
    };
  },
};

export function meta({ loaderData, params }: Route.MetaArgs) {
  const { socialImageUrl, socialImageAlt } = loaderData ?? {};
  const { tag } = params;

  return [
    { title: `Drinks with ${startCase(tag)}` },
    { name: 'description', content: `All drinks containing ${lowerCase(tag)}` },
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

export default function TagPage({ loaderData }: Route.ComponentProps) {
  const { drinks } = loaderData;

  return <DrinkList drinks={drinks} />;
}
