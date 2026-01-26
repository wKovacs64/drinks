import { redirect } from 'react-router';
import { authenticator } from '#/app/auth/auth.server';
import { getSession } from '#/app/auth/session.server';
import { safeRedirectTo } from '#/app/auth/utils.server';
import type { Route } from './+types/login';

export async function loader({ request }: Route.LoaderArgs) {
  await authenticator.authenticate('google', request);
  const session = await getSession(request.headers.get('Cookie'));
  throw redirect(safeRedirectTo(session.get('returnTo')));
}
