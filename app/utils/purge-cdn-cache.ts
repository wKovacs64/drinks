import { invariant } from '@epic-web/invariant';
import { getEnvVars } from './env.server';

const { FASTLY_API_TOKEN, FASTLY_SERVICE_ID } = getEnvVars();

async function purgeCache() {
  if (!FASTLY_API_TOKEN || !FASTLY_SERVICE_ID) {
    console.info('ℹ️ Skipping Fastly cache purge: FASTLY_API_TOKEN or FASTLY_SERVICE_ID not set');
    return;
  }

  try {
    console.log('⏱️ Purging Fastly cache...');
    const response = await fetch(`https://api.fastly.com/service/${FASTLY_SERVICE_ID}/purge_all`, {
      method: 'POST',
      headers: {
        'Fastly-Key': FASTLY_API_TOKEN,
      },
    });
    invariant(response.ok, `Purge failed: ${response.status} ${response.statusText}`);
    console.log('🧹 Successfully purged Fastly cache');
  } catch (error) {
    console.error('❌ Failed to purge Fastly cache', { reason: error });
    // fail the deployment if purge fails
    process.exit(1);
  }
}

await purgeCache();
