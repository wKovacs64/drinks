import type { ActionArgs } from '@remix-run/node';
import { getEnvVars } from '~/utils/env.server.ts';
import { primeContentCache } from '~/utils/prime-content-cache.server.ts';

export const loader = async () => {
  return new Response(null, { status: 405 });
};

export const action = async ({ request }: ActionArgs) => {
  if (request.method !== 'POST') {
    return new Response(null, { status: 405 });
  }

  if (
    request.headers.get('Content-Type') !==
    'application/vnd.contentful.management.v1+json'
  ) {
    return new Response(null, { status: 415 });
  }

  const { CONTENTFUL_WEBHOOK_TOKEN } = getEnvVars();
  if (
    request.headers.get('X-Contentful-Webhook-Token') !==
    CONTENTFUL_WEBHOOK_TOKEN
  ) {
    return new Response(null, { status: 401 });
  }

  // We could be smarter here and only update cache related to the changed
  // content (provided in the request body), but refreshing the entire cache is
  // so fast that it's really not worth it at this time.
  await primeContentCache();

  return new Response(null, { status: 204 });
};
