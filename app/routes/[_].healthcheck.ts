import type { LoaderFunctionArgs } from '@remix-run/node';
import { db, cacheEntry } from '~/db.server/drizzle';

export async function loader({ request }: LoaderFunctionArgs) {
  const host = request.headers.get('X-Forwarded-Host') ?? request.headers.get('host');
  const url = new URL('/', `http://${host}`);

  try {
    await Promise.all([
      db.select({ id: cacheEntry.id }).from(cacheEntry).limit(1),
      fetch(url.toString(), {
        method: 'HEAD',
        headers: { 'x-from-healthcheck': 'true' },
      }).then((response) => {
        if (!response.ok) return Promise.reject(response);
      }),
    ]);
    return new Response('OK', { status: 200 });
  } catch (error: unknown) {
    console.log('❌ Healthcheck failed', { error });
    return new Response('ERROR', { status: 500 });
  }
}
