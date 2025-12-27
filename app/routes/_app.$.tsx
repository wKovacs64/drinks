import { cacheHeader } from 'pretty-cache-header';
import {
  defaultPageDescription,
  defaultPageTitle,
  notFoundPageDescription,
  notFoundPageTitle,
} from '#/app/core/config';
import { NotFound } from '#/app/core/not-found';
import { getEnvVars } from '#/app/utils/env.server';
import type { Route } from './+types/_app.$';

const { SITE_IMAGE_URL, SITE_IMAGE_ALT } = getEnvVars();

export function headers() {
  return {
    'Cache-Control': cacheHeader({
      public: true,
      maxAge: '30sec',
      sMaxage: '5min',
      mustRevalidate: true,
    }),
  };
}

export async function loader() {
  return { socialImageUrl: SITE_IMAGE_URL, socialImageAlt: SITE_IMAGE_ALT };
}

export function meta({ loaderData }: Route.MetaArgs) {
  const { socialImageUrl, socialImageAlt } = loaderData ?? {};

  return [
    { title: notFoundPageTitle },
    { name: 'description', content: notFoundPageDescription },
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

export default NotFound;
