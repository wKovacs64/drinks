import { getEnvVars } from '#/app/utils/env.server';
import { resetAndSeedDatabase } from '#/app/db/reset.server';

import type { Route } from './+types/[_].reset-db';

const { NODE_ENV } = getEnvVars();

export async function action({ request }: Route.ActionArgs) {
  // Only allow in test environment
  if (NODE_ENV !== 'test') {
    throw new Response('Not Found', { status: 404 });
  }

  if (request.method !== 'POST') {
    throw new Response('Method Not Allowed', { status: 405 });
  }

  await resetAndSeedDatabase();

  return Response.json({ success: true });
}

export async function loader() {
  // Don't expose this endpoint via GET
  throw new Response('Not Found', { status: 404 });
}
