import type { LoaderArgs } from '@remix-run/node';
import { prisma } from '~/utils/db.server';

export async function loader({ request }: LoaderArgs) {
  const host =
    request.headers.get('X-Forwarded-Host') ?? request.headers.get('host');
  const url = new URL('/', `http://${host}`);

  try {
    await Promise.all([
      prisma.cacheEntry.count(),
      fetch(url.toString(), { headers: { 'x-from-healthcheck': 'true' } }).then(
        (response) => {
          if (!response.ok) return Promise.reject(response);
        },
      ),
    ]);
    return new Response('OK', { status: 200 });
  } catch (error: unknown) {
    console.log('❌ Healthcheck failed', { error });
    return new Response('ERROR', { status: 500 });
  }
}
