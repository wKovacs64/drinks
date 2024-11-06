import { PassThrough } from 'node:stream';
import {
  createReadableStreamFromReadable,
  type AppLoadContext,
  type EntryContext,
  type HandleDataRequestFunction,
} from '@remix-run/node';
import { RemixServer } from '@remix-run/react';
import express from 'express';
import morgan from 'morgan';
import { createExpressApp } from 'remix-create-express-app';
import { isbot } from 'isbot';
import { renderToPipeableStream } from 'react-dom/server';

// Reject all pending promises from handler functions after 5 seconds
export const streamTimeout = 5_000;

// Abort timeout for request handler functions (should be longer than `streamTimeout`)
const ABORT_DELAY = 10_000;

export default function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  remixContext: EntryContext,
  // This is ignored so we can keep it in the template for visibility.  Feel
  // free to delete this parameter in your app if you're not using it!
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  loadContext: AppLoadContext,
) {
  return isbot(request.headers.get('user-agent') || '')
    ? handleBotRequest(request, responseStatusCode, responseHeaders, remixContext)
    : handleBrowserRequest(request, responseStatusCode, responseHeaders, remixContext);
}

function handleBotRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  remixContext: EntryContext,
) {
  return new Promise((resolve, reject) => {
    let shellRendered = false;
    const { pipe, abort } = renderToPipeableStream(
      <RemixServer context={remixContext} url={request.url} abortDelay={ABORT_DELAY} />,
      {
        onAllReady() {
          shellRendered = true;
          const body = new PassThrough();
          const stream = createReadableStreamFromReadable(body);

          responseHeaders.set('Content-Type', 'text/html');

          resolve(
            new Response(stream, {
              headers: responseHeaders,
              status: responseStatusCode,
            }),
          );

          pipe(body);
        },
        onShellError(error: unknown) {
          reject(error);
        },
        onError(error: unknown) {
          responseStatusCode = 500;
          // Log streaming rendering errors from inside the shell.  Don't log
          // errors encountered during initial shell rendering since they'll
          // reject and get logged in handleDocumentRequest.
          if (shellRendered) {
            console.error(error);
          }
        },
      },
    );

    // Automatically timeout the React renderer after some time
    setTimeout(abort, ABORT_DELAY);
  });
}

function handleBrowserRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  remixContext: EntryContext,
) {
  return new Promise((resolve, reject) => {
    let shellRendered = false;
    const { pipe, abort } = renderToPipeableStream(
      <RemixServer context={remixContext} url={request.url} abortDelay={ABORT_DELAY} />,
      {
        onShellReady() {
          shellRendered = true;
          const body = new PassThrough();
          const stream = createReadableStreamFromReadable(body);

          responseHeaders.set('Content-Type', 'text/html');

          resolve(
            new Response(stream, {
              headers: responseHeaders,
              status: responseStatusCode,
            }),
          );

          pipe(body);
        },
        onShellError(error: unknown) {
          reject(error);
        },
        onError(error: unknown) {
          responseStatusCode = 500;
          // Log streaming rendering errors from inside the shell.  Don't log
          // errors encountered during initial shell rendering since they'll
          // reject and get logged in handleDocumentRequest.
          if (shellRendered) {
            console.error(error);
          }
        },
      },
    );

    // Automatically timeout the React renderer after some time
    setTimeout(abort, ABORT_DELAY);
  });
}

// https://sergiodxa.com/articles/fix-double-data-request-when-prefetching-in-remix
export const handleDataRequest: HandleDataRequestFunction = async (response, { request }) => {
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

// magic "app" export for remix-create-express-app
export const app = createExpressApp({
  configure(expressApp) {
    // https://expressjs.com/en/advanced/best-practice-security.html#reduce-fingerprinting
    expressApp.disable('x-powered-by');

    // Redirect 'www' subdomain to the apex domain
    expressApp.use((req, res, next) => {
      const requestedHostname = req.get('X-Forwarded-Host') || req.hostname;
      if (requestedHostname.startsWith('www')) {
        const apexHostname = requestedHostname.replace('www.', '');
        res.redirect(301, `https://${apexHostname}${req.originalUrl}`);
        return;
      }

      next();
    });

    // Enforce clean URLs (remove trailing slashes)
    expressApp.use((req, res, next) => {
      if (req.path.endsWith('/') && req.path.length > 1) {
        const query = req.url.slice(req.path.length);
        const safePath = req.path.slice(0, -1).replace(/\/+/g, '/');
        res.redirect(301, safePath + query);
        return;
      }

      next();
    });

    // Set some headers
    expressApp.use((_, res, next) => {
      res.set('X-Fly-Region', process.env.FLY_REGION ?? 'unknown');

      if (process.env.NODE_ENV === 'production') {
        res.set(
          'Content-Security-Policy',
          [
            `base-uri 'none'`,
            `frame-ancestors 'none'`,
            `form-action 'self'`,
            `default-src 'self'`,
            `connect-src 'self' https://images.ctfassets.net/ https://*.algolianet.com https://*.algolia.net`,
            `img-src 'self' data: https:`,
            `script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net/`,
            `style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net/`,
          ].join('; '),
        );
      }

      res.set(
        'Permissions-Policy',
        ['geolocation=()', 'camera=()', 'microphone=()', 'payment=()', 'usb=()'].join(', '),
      );
      res.set('Referrer-Policy', 'strict-origin-when-cross-origin');
      res.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
      res.set('X-Content-Type-Options', 'nosniff');
      res.set('X-Frame-Options', 'DENY');

      next();
    });

    if (process.env.NODE_ENV === 'production') {
      // Remix fingerprints its assets so we can cache forever
      expressApp.use(
        '/assets',
        express.static('build/client/assets', { immutable: true, maxAge: '1y' }),
      );
    }

    // Everything else is cached for less than forever, but still a long time
    expressApp.use(express.static('build/client', { maxAge: '1d' }));

    // Log all requests except for health checks
    expressApp.use(
      morgan('tiny', {
        skip: (req) => req.url === '/_/healthcheck' || Boolean(req.headers['x-from-healthcheck']),
      }),
    );
  },
});
