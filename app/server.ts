import { createHonoServer } from 'react-router-hono-server/node';
import type { Context, Next } from 'hono';
import pc from 'picocolors';

export default await createHonoServer({
  defaultLogger: false,
  configure(server) {
    server.use(customLogger());
  },
});

function customLogger() {
  return async (ctx: Context, next: Next) => {
    // Skip logging of certain requests
    if (['/healthcheck', '/__manifest'].includes(ctx.req.path) || ctx.req.method === 'HEAD') {
      await next();
    } else {
      // Start the clock
      const start = performance.now();
      const url = new URL(ctx.req.url);
      const pathWithSearchParams = `${url.pathname}${url.search}`;

      // Call the next middleware
      await next();

      // Calculate response time
      const duration = Math.round((performance.now() - start) * 1000) / 1000;

      // Get the appropriate color function based on status code
      const colorFn = getStatusColorFn(ctx.res.status);

      // Log the response
      console.log(
        `${ctx.req.method} ${pathWithSearchParams} ${colorFn(ctx.res.status)} ${duration}ms`,
      );
    }
  };
}

function getStatusColorFn(status: number) {
  if (status >= 500) return pc.red;
  if (status >= 400) return pc.yellow;
  if (status >= 300) return pc.cyan;
  if (status >= 200) return pc.green;
  return pc.white;
}
