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

  // This route is used by E2E tests to reset the database to a known state between test runs. The
  // invariant above ensures this route is only available in the test environment.
  await resetAndSeedDatabase();

  return new Response(null, { status: 204 });
}
