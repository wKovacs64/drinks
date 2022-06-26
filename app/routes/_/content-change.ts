import type { ActionFunction, LoaderFunction } from '@remix-run/node';
import dns from '~/utils/dns.server';
import { getEnvVars } from '~/utils/env.server';
import { primeContentCache } from '~/utils/prime-content-cache.server';

export const action: ActionFunction = async ({ request }) => {
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

  // Trigger a content cache rebuild on the other instances, too
  await rebuildContentCacheOnTheOtherInstances(request);

  return new Response(null, { status: 204 });
};

export const loader: LoaderFunction = async () => {
  return new Response(null, { status: 405 });
};

async function rebuildContentCacheOnTheOtherInstances(request: Request) {
  // if the "no-replay" query parameter is present, we've received this request
  // from another instance and it's already taking care of telling the other
  // instances, so we don't need to do it again (which would result in an
  // infinite loop if we did)
  const url = new URL(request.url);
  if (url.searchParams.get('no-replay') !== null) return;

  const appName = process.env.FLY_APP_NAME;
  const appRegion = process.env.FLY_REGION;

  // local development
  if (!appName || !appRegion) return;

  // e.g., [["dfw,sea"]]
  const appRegionsTxtResult = await dns.promises.resolveTxt(
    `regions.${appName}.internal`,
  );
  const appRegions = appRegionsTxtResult[0][0].split(',');

  // ⚠ assuming only one instance per region
  const otherRegions = appRegions.filter((region) => region !== appRegion);

  // include the "no-replay" query parameter to prevent infinite loops
  const webhookUrlsForOtherInstances = otherRegions.map(
    (region) =>
      `http://${region}.${appName}.internal:8080/_/content-change?no-replay`,
  );

  // grab the relevant info from the original request to include in the replays
  const { method } = request;
  const contentType = request.headers.get('Content-Type') ?? '';
  const token = request.headers.get('X-Contentful-Webhook-Token') ?? '';

  // execute replay requests serially to avoid exceeding Contentful's API limits
  for (const internalWebhookUrl of webhookUrlsForOtherInstances) {
    await fetch(internalWebhookUrl, {
      method,
      headers: {
        'Content-Type': contentType,
        'X-Contentful-Webhook-Token': token,
      },
    });
  }
}
