import type { Middleware } from "remix/router";
export const responseHeaders: Middleware = async (context, next) => {
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
