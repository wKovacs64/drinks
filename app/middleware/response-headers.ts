import type { Middleware } from "remix/router";
import { isAdminUrl, isAuthUrl } from "#/app/web/route-matching.ts";

export const responseHeaders: Middleware = async (context, next) => {
  const response = await next();

  if (isAdminUrl(context.url) || isAuthUrl(context.url))
    response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains");
  response.headers.set(
    "Permissions-Policy",
    "geolocation=(), camera=(), microphone=(), payment=(), usb=()",
  );

  return response;
};
