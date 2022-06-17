import type { EntryContext, HandleDataRequestFunction } from '@remix-run/node';
import { RemixServer } from '@remix-run/react';
import { renderToString } from 'react-dom/server';

const securityHeaders = {
  csp: "base-uri 'none'; frame-ancestors 'none'; form-action 'self'; default-src 'self'; connect-src 'self' ws: https://images.ctfassets.net/ https://*.algolianet.com https://*.algolia.net; img-src 'self' data: https:; object-src 'none'; script-src 'self' 'unsafe-inline' https://*.algolianet.com; style-src 'self' 'unsafe-inline'; worker-src 'self';",
  pp: 'geolocation=(), camera=(), microphone=(), payment=(), usb=()',
  rp: 'strict-origin-when-cross-origin',
  sts: 'max-age=63072000; includeSubDomains; preload',
  xCTO: 'nosniff',
  xFO: 'DENY',
};

export default function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  remixContext: EntryContext,
) {
  let markup = renderToString(
    <RemixServer context={remixContext} url={request.url} />,
  );

  responseHeaders.set('Content-Type', 'text/html');

  responseHeaders.set('Content-Security-Policy', securityHeaders.csp);
  responseHeaders.set('Permissions-Policy', securityHeaders.pp);
  responseHeaders.set('Referrer-Policy', securityHeaders.rp);
  responseHeaders.set('Strict-Transport-Security', securityHeaders.sts);
  responseHeaders.set('X-Content-Type-Options', securityHeaders.xCTO);
  responseHeaders.set('X-Frame-Options', securityHeaders.xFO);

  return new Response('<!DOCTYPE html>' + markup, {
    status: responseStatusCode,
    headers: responseHeaders,
  });
}

// https://sergiodxa.com/articles/fix-double-data-request-when-prefetching-in-remix
export const handleDataRequest: HandleDataRequestFunction = async (
  response,
  { request },
) => {
  const isGet = request.method.toLowerCase() === 'get';
  const purpose =
    request.headers.get('Purpose') ||
    request.headers.get('X-Purpose') ||
    request.headers.get('Sec-Purpose') ||
    request.headers.get('Sec-Fetch-Purpose') ||
    request.headers.get('Moz-Purpose');
  const isPrefetch = purpose === 'prefetch';

  // Cache all prefetch resources in the browser for 10 seconds
  if (isGet && isPrefetch && !response.headers.has('Cache-Control')) {
    response.headers.set('Cache-Control', 'private, max-age=10');
  }

  return response;
};
