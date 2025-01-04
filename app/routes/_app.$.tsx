import { cacheHeader } from 'pretty-cache-header';
import { appDescription, appTitle, notFoundDescription, notFoundTitle } from '~/core/config';
import { NotFound } from '~/core/not-found';
import { getEnvVars } from '~/utils/env.server';
import type { Route } from './+types/_app.$';

const { SITE_IMAGE_URL, SITE_IMAGE_ALT } = getEnvVars();

export function headers() {
  return {
    'Cache-Control': cacheHeader({
      maxAge: '1min',
      sMaxage: '5min',
      mustRevalidate: true,
    }),
  };
}

export async function loader() {
  return { socialImageUrl: SITE_IMAGE_URL, socialImageAlt: SITE_IMAGE_ALT };
}

export function meta({ data: loaderData }: Route.MetaArgs) {
  const { socialImageUrl, socialImageAlt } = loaderData;

  return [
    { title: notFoundTitle },
    { name: 'description', content: notFoundDescription },
    { property: 'og:title', content: appTitle },
    { property: 'og:description', content: appDescription },
    { property: 'og:image', content: socialImageUrl },
    { property: 'og:image:alt', content: socialImageAlt },
    { name: 'twitter:title', content: appTitle },
    { name: 'twitter:description', content: appDescription },
    { name: 'twitter:image', content: socialImageUrl },
    { name: 'twitter:image:alt', content: socialImageAlt },
  ];
}

export default NotFound;
