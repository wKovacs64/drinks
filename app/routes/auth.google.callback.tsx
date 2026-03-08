import { redirect, href } from "react-router";
import { getClientIPAddress } from "remix-utils/get-client-ip-address";
import type { AuthenticatedUser } from "#/app/modules/auth";
import {
  authenticator,
  commitSession,
  getSession,
  safeRedirectTo,
} from "#/app/modules/auth/index.server";
import type { Route } from "./+types/auth.google.callback";

export async function loader({ request }: Route.LoaderArgs) {
  let authenticatedUser: AuthenticatedUser | undefined;

  try {
    authenticatedUser = await authenticator.authenticate("google", request);
  } catch (error) {
    console.error(error);
    console.error(`[auth|callback-error] Client IP address: ${getClientIPAddress(request)}`);
    console.error(`[auth|callback-error] User-Agent: ${request.headers.get("User-Agent")}`);
    throw redirect(href("/login-failed"));
  }

  const session = await getSession(request.headers.get("Cookie"));
  session.set("user", authenticatedUser);

  throw redirect(safeRedirectTo(session.get("returnTo")), {
    headers: { "Set-Cookie": await commitSession(session) },
  });
}
