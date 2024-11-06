import { cacheHeader } from 'pretty-cache-header';
import { getEnvVars } from '~/utils/env.server';

const { DEPLOYMENT_ENV } = getEnvVars();

export async function loader() {
  const body = `User-agent: *\n${DEPLOYMENT_ENV === 'prod' ? 'Allow: /' : 'Disallow: /'}`;

  return new Response(body, {
    headers: {
      'Cache-Control': cacheHeader({ maxAge: '1hr' }),
      'Content-Type': 'text/plain; charset=utf-8',
    },
  });
}
