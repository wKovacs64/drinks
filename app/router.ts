import { createRouter, type MiddlewareContext, type Middleware } from "remix/router";
import { render } from "remix/middleware/render";
import { staticFiles } from "remix/middleware/static";
import { Auth } from "remix/middleware/auth";
import { Session } from "remix/session";
import { cop } from "remix/middleware/cop";
import { compression } from "remix/middleware/compression";
import { logger } from "remix/middleware/logger";
import { isCompressibleMimeType } from "remix/mime";
import { redirect } from "remix/response/redirect";
import {
  getIdentitySessionMiddleware,
  getIdentityAuthMiddleware,
  createReturnToUrl,
} from "#/app/modules/identity/identity.server.ts";
import controller from "./actions/controller.tsx";
import { assets } from "./assets.ts";
import { routes } from "./routes.ts";
const renderMiddleware = render({
  assets,
  onError: (error) => console.error("Remix rendering failed", error),
});
const sessionMiddleware = getIdentitySessionMiddleware();
const authMiddleware = getIdentityAuthMiddleware();
export type AppContext = MiddlewareContext<
  [typeof renderMiddleware, typeof sessionMiddleware, typeof authMiddleware]
>;
declare module "remix" {
  interface RouterTypes {
    context: AppContext;
  }
}
const protectAdmin: Middleware = async (context, next) => {
  const url = new URL(context.request.url);
  const isAdmin = url.pathname === "/admin" || url.pathname.startsWith("/admin/");
  if (isAdmin) {
    const identity = context.get(Auth);
    if (!identity?.ok) {
      context.get(Session)?.set("returnTo", createReturnToUrl(context.request));
      return redirect("/login");
    }
    if (
      !(
        typeof identity.identity === "object" &&
        identity.identity &&
        "role" in identity.identity &&
        identity.identity.role === "admin"
      )
    )
      return redirect("/unauthorized");
  }
  return next();
};
const responseHeaders: Middleware = async (context, next) => {
  const pathname = new URL(context.request.url).pathname;
  const isAdmin = pathname === "/admin" || pathname.startsWith("/admin/");
  const response = await next();
  if (isAdmin || pathname.startsWith("/auth/") || ["/login", "/logout"].includes(pathname))
    response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set(
    "Permissions-Policy",
    "geolocation=(), camera=(), microphone=(), payment=(), usb=()",
  );
  response.headers.set(
    "Content-Security-Policy",
    "base-uri 'none'; frame-ancestors 'none'; form-action 'self'; default-src 'self'; connect-src 'self' https://ik.imagekit.io/; img-src 'self' data: blob: https:; script-src 'self' blob: 'unsafe-inline'; style-src 'self' 'unsafe-inline'",
  );
  return response;
};
export const router = createRouter<AppContext>({
  middleware: [
    logger({ format: "%method %pathname %status %duration ms", colors: false }),
    // The original origin deliberately leaves compression to Fastly and Fly Proxy.
    ...(process.env.NODE_ENV === "production"
      ? []
      : [
          compression({
            filterMediaType: (mediaType) =>
              mediaType !== "text/event-stream" && isCompressibleMimeType(mediaType),
          }),
        ]),
    cop(),
    staticFiles("./public", { index: false }),
    renderMiddleware,
    sessionMiddleware,
    authMiddleware,
    responseHeaders,
    protectAdmin,
  ],
});
router.map(routes, controller);
