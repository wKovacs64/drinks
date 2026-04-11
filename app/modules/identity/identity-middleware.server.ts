import { href, redirect, type MiddlewareFunction } from "react-router";
import { getDb } from "#/app/db/client.server";
import { commitSession, destroySession, getSession } from "./identity-session.server";
import { createReturnToUrl } from "./identity-navigation.server";
import { createIdentityService } from "./identity.server";
import { getUserFromContext, optionalUserContext, userContext } from "./identity-context.server";

export const requireUser: MiddlewareFunction<Response> = async ({ request, context }, next) => {
  const session = await getSession(request.headers.get("Cookie"));
  const authenticatedUser = session.get("user");

  if (!authenticatedUser) {
    session.set("returnTo", createReturnToUrl(request));
    throw redirect(href("/login"), {
      headers: { "Set-Cookie": await commitSession(session) },
    });
  }

  const identityService = createIdentityService({ db: getDb() });
  const sessionUser = await identityService.getSessionUser({ userId: authenticatedUser.id });

  if (!sessionUser) {
    throw redirect(href("/login"), {
      headers: { "Set-Cookie": await destroySession(session) },
    });
  }

  context.set(userContext, sessionUser);

  return next();
};

export const optionalUser: MiddlewareFunction<Response> = async ({ request, context }, next) => {
  const session = await getSession(request.headers.get("Cookie"));
  const authenticatedUser = session.get("user");

  if (!authenticatedUser) {
    context.set(optionalUserContext, undefined);
    return next();
  }

  const identityService = createIdentityService({ db: getDb() });
  const sessionUser = await identityService.getSessionUser({ userId: authenticatedUser.id });

  context.set(optionalUserContext, sessionUser ?? undefined);

  return next();
};

export const requireRole =
  (roles: readonly ("user" | "admin")[]): MiddlewareFunction<Response> =>
  async ({ context }, next) => {
    const user = getUserFromContext(context);

    if (!roles.includes(user.role)) {
      throw redirect(href("/unauthorized"));
    }

    return next();
  };
