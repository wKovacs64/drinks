import { createMiddleware, type Middleware } from "remix/router";
import { Auth, requireAuth } from "remix/middleware/auth";
import { redirect } from "remix/response/redirect";
import { routes } from "#/app/routes.ts";
import type { SessionUser } from "#/app/modules/identity/identity.ts";
import { isAdminUrl } from "#/app/web/route-matching.ts";

const requireAdminAuthentication = requireAuth<SessionUser>({
  onFailure(context) {
    // Only a GET or HEAD can be replayed by navigating back after login.
    const { method } = context.request;
    if (method !== "GET" && method !== "HEAD") return redirect(routes.auth.login.href());
    const returnTo = context.url.pathname + context.url.search;
    return redirect(routes.auth.login.href(undefined, { searchParams: { returnTo } }));
  },
});

function isAdmin(identity: unknown): identity is { role: "admin" } {
  return (
    typeof identity === "object" &&
    identity !== null &&
    "role" in identity &&
    identity.role === "admin"
  );
}

const requireAdminRole: Middleware = (context, next) => {
  const auth = context.get(Auth);
  if (!(auth?.ok && isAdmin(auth.identity))) return redirect(routes.auth.unauthorized.href());
  return next();
};

/** Controller middleware that admits only an Admin and narrows `context.auth` to a `SessionUser`. */
export const requireAdmin = createMiddleware(requireAdminAuthentication, requireAdminRole);

/** Denies every admin URL by default, including ones no controller with `requireAdmin` handles. */
export const protectAdmin: Middleware = (context, next) => {
  if (!isAdminUrl(context.url)) return next();
  return requireAdminAuthentication(context, async () => requireAdminRole(context, next));
};
