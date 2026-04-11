import { Authenticator } from "remix-auth";
import { GoogleStrategy } from "@coji/remix-auth-google";
import { invariant } from "@epic-web/invariant";
import { getDb } from "#/app/db/client.server";
import { getEnvVars } from "#/app/core/env.server";
import type { AuthenticatedUser } from "./identity";
import { updateIdentityUserOnLogin } from "./identity-persistence.server";

const verify: ConstructorParameters<typeof GoogleStrategy<AuthenticatedUser>>[1] = async ({
  tokens,
}) => {
  const profile = await GoogleStrategy.userProfile(tokens);
  const email = profile.emails?.[0]?.value;
  invariant(email, "No email found in Google profile");

  const user = await updateIdentityUserOnLogin(getDb(), {
    email,
    name: profile.displayName ?? null,
    avatarUrl: profile.photos?.[0]?.value ?? null,
  });

  invariant(user, "User not authorized");

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    avatarUrl: user.avatarUrl,
    role: user.role,
  };
};

let authenticator: Authenticator<AuthenticatedUser> | undefined;

export function getAuthenticator() {
  if (authenticator) {
    return authenticator;
  }

  const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI } = getEnvVars();

  authenticator = new Authenticator<AuthenticatedUser>();
  authenticator.use(
    new GoogleStrategy(
      {
        clientId: GOOGLE_CLIENT_ID,
        clientSecret: GOOGLE_CLIENT_SECRET,
        redirectURI: GOOGLE_REDIRECT_URI,
      },
      verify,
    ),
    "google",
  );

  return authenticator;
}
