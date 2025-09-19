import type { MiddlewareFunction } from 'react-router';
import pc from 'picocolors';

export const loggingMiddleware: MiddlewareFunction<Response> = async ({ request }, next) => {
  // Skip logging of certain requests
  const url = new URL(request.url);
  const pathWithSearchParams = `${url.pathname}${url.search}`;

  if (['/healthcheck', '/__manifest'].includes(url.pathname) || request.method === 'HEAD') {
    return next();
  }

  // Start the clock
  const start = performance.now();

  // Call the next middleware/route handler
  const response = await next();

  // Calculate response time
  const duration = Math.round((performance.now() - start) * 1000) / 1000;

  // Get the appropriate color function based on status code
  const colorFn = getStatusColorFn(response.status);

  // Log the response
  console.log(
    `${request.method} ${pathWithSearchParams} ${colorFn(response.status)} ${duration}ms`,
  );

  return response;
};

function getStatusColorFn(status: number) {
  if (status >= 500) return pc.red;
  if (status >= 400) return pc.yellow;
  if (status >= 300) return pc.cyan;
  if (status >= 200) return pc.green;
  return pc.white;
}
