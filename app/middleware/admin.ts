import type { Middleware } from "remix/router";
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

export const protectAdmin: Middleware = async (context, next) => {
  if (!isAdminUrl(context.url)) return next();

  return requireAdminAuthentication(context, async () => {
    const identity = context.get(Auth);
    if (
      !(
        identity?.ok &&
        typeof identity.identity === "object" &&
        identity.identity &&
        "role" in identity.identity &&
        identity.identity.role === "admin"
      )
    )
      return redirect(routes.auth.unauthorized.href());
    return next();
  });
};
