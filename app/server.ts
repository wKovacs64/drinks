import { createHonoServer } from "react-router-hono-server/node";

// This custom Hono server exists to remove compression as the origin server should not have
// compression enabled when served behind a CDN that does its own compression (and in our case, so
// does Fly's proxy). The default HTTP server provided by react-router-serve has compression enabled
// and there's no way to disable it, so we use a custom server here instead.

export default await createHonoServer({
  configure(app) {
    app.use("*", async (context, next) => {
      const request = context.req.raw;

      if (["POST", "PUT", "PATCH", "DELETE"].includes(request.method)) {
        const originHeader = request.headers.get("Origin");
        const requestUrl = new URL(request.url);
        const originUrl =
          originHeader && originHeader !== "null" && URL.canParse(originHeader)
            ? new URL(originHeader)
            : null;

        if (originUrl && originUrl.host !== requestUrl.host) {
          console.warn("[action-origin-mismatch]", {
            requestUrl: `${requestUrl.origin}${requestUrl.pathname}`,
            origin: originUrl.origin,
            host: request.headers.get("Host"),
            forwardedHost: request.headers.get("X-Forwarded-Host"),
            flyForwardedHost: request.headers.get("Fly-Forwarded-Host"),
          });
        }
      }

      await next();
    });
  },
  // We're doing our own logging via React Router middleware
  defaultLogger: false,
});
