import { getEnvVars } from '~/utils/env.server';
import type { Route } from './+types/[_].content-change';

const { CONTENTFUL_WEBHOOK_TOKEN } = getEnvVars();

export async function loader() {
  return new Response(null, { status: 405 });
}

export async function action({ request }: Route.ActionArgs) {
  if (request.method !== 'POST') {
    return new Response(null, { status: 405 });
  }

  if (request.headers.get('Content-Type') !== 'application/vnd.contentful.management.v1+json') {
    return new Response(null, { status: 415 });
  }

  if (request.headers.get('X-Contentful-Webhook-Token') !== CONTENTFUL_WEBHOOK_TOKEN) {
    return new Response(null, { status: 401 });
  }

  // TODO: Do we want to perform a targeted CDN purge here? The changed content is available in the
  // request body, but we'd have to parse it and figure out what URLs to purge.

  return new Response(null, { status: 204 });
}
