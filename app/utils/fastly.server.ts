import { getEnvVars } from '#/app/utils/env.server';
import { getSurrogateKeyForTag } from '#/app/tags/utils';

const { FASTLY_SERVICE_ID, FASTLY_PURGE_API_KEY } = getEnvVars();

async function purgeFastlyCache(surrogateKeys: string[]): Promise<void> {
  if (!FASTLY_SERVICE_ID || !FASTLY_PURGE_API_KEY) {
    console.log('Fastly not configured, skipping cache purge');
    return;
  }

  const response = await fetch(`https://api.fastly.com/service/${FASTLY_SERVICE_ID}/purge`, {
    method: 'POST',
    headers: {
      'Fastly-Key': FASTLY_PURGE_API_KEY,
      'Surrogate-Key': surrogateKeys.join(' '),
    },
  });

  if (!response.ok) {
    console.error('Failed to purge Fastly cache:', await response.text());
  }
}

/**
 * Purge targeted cache keys affected by a drink change.
 * The `all` key is intentionally excluded here; it is only purged on deploy.
 */
export async function purgeDrinkCache(drink: { slug: string; tags: string[] }): Promise<void> {
  const keys = ['index', 'search', drink.slug, 'tags', ...drink.tags.map(getSurrogateKeyForTag)];
  await purgeFastlyCache(keys);
}
