import { invariantResponse } from '@epic-web/invariant';
import { getEnvVars } from '#/app/utils/env.server';
import { resetAndSeedDatabase } from '#/app/db/reset.server';
import type { Route } from './+types/[_].reset-db';

const { NODE_ENV } = getEnvVars();

export async function loader() {
  invariantResponse(false, 'Not Found', { status: 404 });
}

export async function action({ request }: Route.ActionArgs) {
  invariantResponse(NODE_ENV === 'test', 'Not Found', { status: 404 });
  invariantResponse(request.method === 'POST', 'Method Not Allowed', { status: 405 });

  await resetAndSeedDatabase();

  return Response.json({ success: true });
}
