import { createController } from "remix/router";
import {
  completeAuth,
  createGoogleAuthProvider,
  finishExternalAuth,
  startExternalAuth,
} from "remix/auth";
import { redirect } from "remix/response/redirect";
import { routes } from "#/app/routes.ts";
import { env } from "#/app/core/env.ts";
import { getDb } from "#/app/db/client.ts";
import { createIdentityService } from "#/app/modules/identity/identity.ts";
import { LoginFailedPage } from "./login-failed-page.tsx";
import { UnauthorizedPage } from "./unauthorized-page.tsx";

const googleAuthProvider = createGoogleAuthProvider({
  clientId: env.GOOGLE_CLIENT_ID,
  clientSecret: env.GOOGLE_CLIENT_SECRET,
  redirectUri: new URL(env.GOOGLE_REDIRECT_URI),
  scopes: ["openid", "email", "profile"],
});

export default createController(routes.auth, {
  actions: {
    login(context) {
      // Remix drops Return-to URLs that leave the origin.
      return startExternalAuth(googleAuthProvider, context, {
        returnTo: context.url.searchParams.get("returnTo"),
      });
    },
    async callback(context) {
      try {
        const { result, returnTo } = await finishExternalAuth(googleAuthProvider, context);
        const identityService = createIdentityService({ db: getDb() });
        const user = await identityService.admitUser({
          email: result.profile.email,
          emailVerified: result.profile.email_verified,
          name: result.profile.name,
          avatarUrl: result.profile.picture,
        });
        if (!user) return redirect(routes.auth.failed.href());
        const session = completeAuth(context);
        session.set("userId", user.id);
        return redirect(returnTo ?? routes.home.href());
      } catch (error) {
        console.error(
          "Google authentication failed",
          error instanceof Error ? error.message : "Unknown error",
        );
        return redirect(routes.auth.failed.href());
      }
    },
    logout(context) {
      context.session.destroy();
      return redirect(routes.home.href());
    },
    failed(context) {
      return context.render(<LoginFailedPage />);
    },
    unauthorized(context) {
      return context.render(<UnauthorizedPage />);
    },
  },
});
