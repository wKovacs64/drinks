import {
  createContext,
  href,
  redirect,
  type RouterContextProvider,
  type MiddlewareFunction,
} from 'react-router';
import { getSession, commitSession, destroySession } from '#/app/auth/session.server';
import { getUserById } from '#/app/models/user.server';
import { createReturnToUrl } from '#/app/auth/utils.server';
import type { AuthenticatedUser } from '#/app/auth/types';

const userContext = createContext<AuthenticatedUser>();

/**
 * Get the authenticated user from the route context.
 * Use this in route loaders/actions after userMiddleware has run.
 */
export function getUserFromContext(context: Readonly<RouterContextProvider>): AuthenticatedUser {
  return context.get(userContext);
}

/**
 * Middleware that requires an authenticated user. If authenticated, the user
 * is stored in context (accessible via getUserFromContext). If not authenticated,
 * redirects to login with returnTo URL preserved.
 */
export const userMiddleware: MiddlewareFunction<Response> = async ({ request, context }, next) => {
  const session = await getSession(request.headers.get('Cookie'));
  const sessionUser = session.get('user');

  if (!sessionUser) {
    session.set('returnTo', createReturnToUrl(request));
    throw redirect(href('/login'), {
      headers: { 'Set-Cookie': await commitSession(session) },
    });
  }

  // Verify user still exists in database
  const user = await getUserById(sessionUser.id);

  if (!user) {
    // User was deleted - clear session and redirect to login
    throw redirect(href('/login'), {
      headers: { 'Set-Cookie': await destroySession(session) },
    });
  }

  context.set(userContext, {
    id: user.id,
    email: user.email,
    name: user.name,
    avatarUrl: user.avatarUrl,
    role: user.role,
  });

  return next();
};

/**
 * Middleware that requires the authenticated user has admin role.
 * Must come after userMiddleware in the middleware chain.
 */
export const adminMiddleware: MiddlewareFunction<Response> = async ({ context }, next) => {
  const user = getUserFromContext(context);

  if (user.role !== 'admin') {
    throw redirect(href('/unauthorized'));
  }

  return next();
};
