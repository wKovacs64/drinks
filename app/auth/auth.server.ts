import { Authenticator } from 'remix-auth';
import { GoogleStrategy } from '@coji/remix-auth-google';
import { invariant } from '@epic-web/invariant';
import { getEnvVars } from '#/app/utils/env.server';
import { updateUserOnLogin } from '#/app/models/user.server';
import type { AuthenticatedUser } from './types';

const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI } = getEnvVars();

const googleStrategyOptions = {
  clientId: GOOGLE_CLIENT_ID,
  clientSecret: GOOGLE_CLIENT_SECRET,
  redirectURI: GOOGLE_REDIRECT_URI,
};

/**
 * Verify callback for Google OAuth. Called after successful authentication
 * to check user exists (allowlist) and return session data.
 *
 * Note: Role checking is NOT done here - that's handled by middleware.
 * This allows the same auth flow for different route protection levels.
 */
async function verify({
  tokens,
}: {
  request: Request;
  tokens: Parameters<typeof GoogleStrategy.userProfile>[0];
}): Promise<AuthenticatedUser> {
  const profile = await GoogleStrategy.userProfile(tokens);

  const email = profile.emails?.[0]?.value;
  invariant(email, 'No email found in Google profile');

  const user = await updateUserOnLogin({
    email,
    name: profile.displayName ?? null,
    avatarUrl: profile.photos?.[0]?.value ?? null,
  });

  // Allowlist model: user must exist in database to log in
  // Role checking happens in middleware (adminMiddleware, etc.)
  invariant(user, 'User not authorized');

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    avatarUrl: user.avatarUrl,
    role: user.role,
  };
}

export const authenticator = new Authenticator<AuthenticatedUser>();

authenticator.use(new GoogleStrategy(googleStrategyOptions, verify), 'google');
