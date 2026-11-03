import { routes } from "#/app/routes.ts";
import {
  completeAuth,
  finishExternalAuth,
  startExternalAuth,
  createGoogleAuthProvider,
} from "remix/auth";
import type { ContextEntries, RequestContext } from "remix/router";
import { redirect } from "remix/response/redirect";
import { Session } from "remix/session";
import { env } from "#/app/core/env.ts";
import { getDb } from "#/app/db/client.ts";
import { createIdentityService } from "./identity-service.ts";
const provider = createGoogleAuthProvider({
  clientId: env.GOOGLE_CLIENT_ID,
  clientSecret: env.GOOGLE_CLIENT_SECRET,
  redirectUri: new URL(env.GOOGLE_REDIRECT_URI),
  scopes: ["openid", "email", "profile"],
});
export async function initiateLogin(
  context: RequestContext<Record<string, string>, ContextEntries>,
): Promise<Response> {
  // Remix drops Return-to URLs that leave the origin.
  return startExternalAuth(provider, context, {
    returnTo: context.url.searchParams.get("returnTo"),
  });
}
export async function authenticate(
  context: RequestContext<Record<string, string>, ContextEntries>,
): Promise<Response> {
  try {
    const { result, returnTo } = await finishExternalAuth(provider, context);
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
}
export function logout(context: RequestContext<Record<string, string>, ContextEntries>): Response {
  context.get(Session)?.destroy();
  return redirect(routes.home.href());
}
