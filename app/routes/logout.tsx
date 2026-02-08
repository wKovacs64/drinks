import { redirect, href } from 'react-router';
import { destroySession, getSession } from '#/app/auth/session.server';
import type { Route } from './+types/logout';

export async function loader() {
  throw redirect(href('/'));
}

export async function action({ request }: Route.ActionArgs) {
  const session = await getSession(request.headers.get('Cookie'));

  throw redirect('/', {
    headers: { 'Set-Cookie': await destroySession(session) },
  });
}
