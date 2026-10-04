import {
  completeAuth,
  finishExternalAuth,
  startExternalAuth,
  createGoogleAuthProvider,
} from "remix/auth";
import type { ContextEntries, RequestContext } from "remix/router";
import { redirect } from "remix/response/redirect";
import { Session } from "remix/session";
import { getEnvVars } from "#/app/core/env.server.ts";
import { getDb } from "#/app/db/client.server.ts";
import { updateIdentityUserOnLogin } from "./identity-persistence.server.ts";
import { safeRedirectTo } from "./identity-navigation.server.ts";
let provider: ReturnType<typeof createGoogleAuthProvider> | undefined;
function getProvider() {
  const env = getEnvVars();
  provider ??= createGoogleAuthProvider({
    clientId: env.GOOGLE_CLIENT_ID,
    clientSecret: env.GOOGLE_CLIENT_SECRET,
    redirectUri: new URL(env.GOOGLE_REDIRECT_URI),
    scopes: ["openid", "email", "profile"],
  });
  return provider;
}
export async function initiateLogin(
  context: RequestContext<Record<string, string>, ContextEntries>,
): Promise<Response> {
  const savedReturnTo = context.get(Session)?.get("returnTo");
  return startExternalAuth(getProvider(), context, {
    returnTo: safeRedirectTo(typeof savedReturnTo === "string" ? savedReturnTo : undefined),
  });
}
export async function authenticate(
  context: RequestContext<Record<string, string>, ContextEntries>,
): Promise<Response> {
  try {
    const { result, returnTo } = await finishExternalAuth(getProvider(), context);
    if (!result.profile.email || !result.profile.email_verified) return redirect("/login-failed");
    const user = await updateIdentityUserOnLogin(getDb(), {
      email: result.profile.email,
      name: result.profile.name ?? null,
      avatarUrl: result.profile.picture ?? null,
    });
    if (!user) return redirect("/login-failed");
    const session = completeAuth(context);
    session.set("userId", user.id);
    return redirect(safeRedirectTo(returnTo));
  } catch (error) {
    console.error(
      "Google authentication failed",
      error instanceof Error ? error.message : "Unknown error",
    );
    return redirect("/login-failed");
  }
}
export function logout(context: RequestContext<Record<string, string>, ContextEntries>): Response {
  context.get(Session)?.destroy();
  return redirect("/");
}
