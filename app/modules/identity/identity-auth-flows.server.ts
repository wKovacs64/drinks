import { redirect, href } from "react-router";
import { getClientIPAddress } from "remix-utils/get-client-ip-address";
import type { AuthenticatedUser } from "./identity";
import { getAuthenticator } from "./identity-authenticator.server";
import { safeRedirectTo } from "./identity-navigation.server";
import { commitSession, destroySession, getSession } from "./identity-session.server";

export async function initiateLogin(request: Request): Promise<Response> {
  await getAuthenticator().authenticate("google", request);
  const session = await getSession(request.headers.get("Cookie"));
  return redirect(safeRedirectTo(session.get("returnTo")));
}

export async function authenticate(request: Request): Promise<Response> {
  let authenticatedUser: AuthenticatedUser | undefined;

  try {
    authenticatedUser = await getAuthenticator().authenticate("google", request);
  } catch (error) {
    console.error(error);
    console.error(`[auth|callback-error] Client IP address: ${getClientIPAddress(request)}`);
    console.error(`[auth|callback-error] User-Agent: ${request.headers.get("User-Agent")}`);
    return redirect(href("/login-failed"));
  }

  const session = await getSession(request.headers.get("Cookie"));
  session.set("user", authenticatedUser);

  return redirect(safeRedirectTo(session.get("returnTo")), {
    headers: { "Set-Cookie": await commitSession(session) },
  });
}

export async function logout(request: Request): Promise<Response> {
  const session = await getSession(request.headers.get("Cookie"));

  return redirect(href("/"), {
    headers: { "Set-Cookie": await destroySession(session) },
  });
}
