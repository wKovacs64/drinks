import type { Middleware } from "remix/router";
import { Auth } from "remix/middleware/auth";
import { Session } from "remix/session";
import { redirect } from "remix/response/redirect";
import { routes } from "#/app/routes.ts";
import { createReturnToUrl } from "#/app/modules/identity/identity.server.ts";
export const protectAdmin: Middleware = async (context, next) => {
  const url = new URL(context.request.url);
  const isAdmin = url.pathname === "/admin" || url.pathname.startsWith("/admin/");
  if (isAdmin) {
    const identity = context.get(Auth);
    if (!identity?.ok) {
      context.get(Session)?.set("returnTo", createReturnToUrl(context.request));
      return redirect(routes.auth.login.href());
    }
    if (
      !(
        typeof identity.identity === "object" &&
        identity.identity &&
        "role" in identity.identity &&
        identity.identity.role === "admin"
      )
    )
      return redirect(routes.auth.unauthorized.href());
  }
  return next();
};
