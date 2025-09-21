// import { getSurrogateKeyForTag } from '~/tags/utils';
import { getEnvVars } from '~/utils/env.server';
import { drinkEntrySchema, type DrinkEntry } from './drink-entry';
import type { Route } from './+types/route';

const { CONTENTFUL_WEBHOOK_TOKEN, FASTLY_SERVICE_ID, FASTLY_PURGE_API_KEY } = getEnvVars();

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

  if (FASTLY_SERVICE_ID && FASTLY_PURGE_API_KEY) {
    try {
      const body = await request.json();
      const drinkEntry = drinkEntrySchema.parse(body);
      const surrogateKeys = getSurrogateKeysToPurge(drinkEntry).join(' ');

      console.log(`Purging surrogate keys: ${surrogateKeys}`);
      await fetch(`https://api.fastly.com/service/${FASTLY_SERVICE_ID}/purge`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'Fastly-Key': FASTLY_PURGE_API_KEY,
          'Surrogate-Key': surrogateKeys,
        },
      });

      return new Response(null, { status: 204 });
    } catch (error) {
      console.error(error);
      return new Response(null, { status: 400 });
    }
  }

  return new Response(null, { status: 204 });
}

/**
 * Get the surrogate keys to purge for a given drink entry.
 *
 * @example ['index', 'black-manhattan', 'rye', 'amaro_nonino', 'angostura', 'bitters', 'orange_bitters']
 */
function getSurrogateKeysToPurge(drinkEntry: DrinkEntry) {
  return [
    // all drinks are currently listed on the index page, so we need to purge that
    'index',
    // and we obviously need to purge the drink's own page
    drinkEntry.fields.slug['en-US'],
    // and all the tags that the drink is associated with (includes the tags index page, which
    // includes every tag in its surrogate keys)
    // ...drinkEntry.fields.tags['en-US'].map(getSurrogateKeyForTag),
    // but what about tags that were removed? 🤔 we can't really do this without some kind of diff.
    // so for now, I guess we'll just purge all tags instead 🙁
    'tags',
  ];
}
