import { createCookie, createCookieSessionStorage } from 'react-router';
import { getEnvVars } from '#/app/utils/env.server';
import type { AuthenticatedUser } from './types';

const { SESSION_SECRET, NODE_ENV } = getEnvVars();

export const sessionCookie = createCookie('__session', {
  httpOnly: true,
  path: '/',
  sameSite: 'lax',
  secrets: [SESSION_SECRET],
  secure: NODE_ENV === 'production',
});

type SessionData = {
  user?: AuthenticatedUser;
  returnTo?: string;
};

const cookieSessionStorage = createCookieSessionStorage<SessionData>({
  cookie: sessionCookie,
});

export const { getSession, commitSession, destroySession } = cookieSessionStorage;

/**
 * Get the raw session cookie value for a user.
 * Used in Playwright tests to inject auth cookies.
 */
export async function getRawSessionCookieValue(user: AuthenticatedUser): Promise<string> {
  const session = await getSession();
  session.set('user', user);
  const serializedCookie = await commitSession(session);
  // Extract just the cookie value (before the first semicolon)
  const [cookiePair] = serializedCookie.split(';');
  const [, value] = cookiePair.split('=');
  return value;
}
