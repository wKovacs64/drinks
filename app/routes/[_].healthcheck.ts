import type { LoaderFunctionArgs } from '@remix-run/node';
import { invariant } from '@epic-web/invariant';

export async function loader({ request }: LoaderFunctionArgs) {
  const host = request.headers.get('X-Forwarded-Host') || request.headers.get('host');
  const url = new URL('/', `http://${host}`);

  try {
    const response = await fetch(url.toString(), {
      method: 'HEAD',
      headers: { 'x-from-healthcheck': 'true' },
    });
    invariant(response.ok, `HEAD request failed to ${url}`);
    return new Response('OK', { status: 200 });
  } catch (error) {
    console.log('❌ Healthcheck failed', { error });
    return new Response('ERROR', { status: 500 });
  }
}
