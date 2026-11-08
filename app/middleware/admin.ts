import { createMiddleware, type Middleware } from "remix/router";
import { Auth, requireAuth } from "remix/middleware/auth";
import { redirect } from "remix/response/redirect";
import { Renderer, type RenderFunction } from "remix/middleware/render";
import { routes } from "#/app/routes.ts";
import type { SessionUser } from "#/app/modules/identity/identity.ts";
import { isAdminUrl } from "#/app/web/route-matching.ts";
import { renderSessionExpired } from "#/app/actions/auth/session-expired-page.tsx";

function isRenderFunction(value: unknown): value is RenderFunction {
  return typeof value === "function";
}

const requireAdminAuthentication = requireAuth<SessionUser>({
  onFailure(context) {
    // Only a GET or HEAD can be replayed by navigating back after login.
    const { method } = context.request;

    const loginHref =
      method !== "GET" && method !== "HEAD"
        ? routes.auth.login.href()
        : routes.auth.login.href(undefined, {
            searchParams: { returnTo: context.url.pathname + context.url.search },
          });

    // Frame requests fetch same-origin only, so they can't follow the redirect to Google.
    const render = context.get(Renderer);

    if (context.request.headers.get("X-Remix-Frame") === "true" && isRenderFunction(render))
      return renderSessionExpired(render, loginHref);

    return redirect(loginHref);
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

  if (!(auth?.ok === true && isAdmin(auth.identity)))
    return redirect(routes.auth.unauthorized.href());

  return next();
};

/** Controller middleware that admits only an Admin and narrows `context.auth` to a `SessionUser`. */
export const requireAdmin = createMiddleware(requireAdminAuthentication, requireAdminRole);

/** Denies every admin URL by default, including ones no controller with `requireAdmin` handles. */
export const protectAdmin: Middleware = (context, next) => {
  if (!isAdminUrl(context.url)) return next();

  return requireAdminAuthentication(context, async () => requireAdminRole(context, next));
};
