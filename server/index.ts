import * as fs from 'node:fs';
import chokidar from 'chokidar';
import express from 'express';
import compression from 'compression';
import morgan from 'morgan';
import { createRequestHandler } from '@remix-run/express';
import {
  broadcastDevReady,
  installGlobals,
  type ServerBuild,
} from '@remix-run/node';
import { getInstanceInfo } from 'litefs-js';
import { primeContentCache } from '~/utils/prime-content-cache.server.ts';

// @ts-ignore - this file may not exist if you haven't built yet, but it will
// definitely exist by the time the dev or prod server actually runs.
import * as remixBuild from '../build/index.js';
const build = remixBuild as unknown as ServerBuild;

const BUILD_PATH = '../build/index.js';

installGlobals();

const isDev = process.env.NODE_ENV === 'development';

const app = express();

// redirect 'www' subdomain to the apex domain
app.use((req, res, next) => {
  if (req.hostname.startsWith('www')) {
    const apexHostname = req.hostname.replace('www.', '');
    res.redirect(301, `https://${apexHostname}${req.originalUrl}`);
  } else {
    next();
  }
});

app.use((req, res, next) => {
  // miscellaneous headers
  res.set('X-Fly-Region', process.env.FLY_REGION ?? 'unknown');

  // security headers
  if (!isDev) {
    // TODO: figure out a way to make this work in development with Remix's new
    // dev server
    res.set(
      'Content-Security-Policy',
      [
        `base-uri 'none'`,
        `frame-ancestors 'none'`,
        `form-action 'self'`,
        `default-src 'self'`,
        `connect-src 'self' https://images.ctfassets.net/ https://*.algolianet.com https://*.algolia.net`,
        `img-src 'self' data: https:`,
        `object-src 'none'`,
        `script-src 'self' 'unsafe-inline' https://*.algolianet.com`,
        `style-src 'self' 'unsafe-inline'`,
        `worker-src 'self'`,
      ].join('; ') + ';',
    );
  }
  res.set(
    'Permissions-Policy',
    [
      'geolocation=()',
      'camera=()',
      'microphone=()',
      'payment=()',
      'usb=()',
    ].join(', '),
  );
  res.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.set(
    'Strict-Transport-Security',
    'max-age=63072000; includeSubDomains; preload',
  );
  res.set('X-Content-Type-Options', 'nosniff');
  res.set('X-Frame-Options', 'DENY');

  // /clean-urls/ -> /clean-urls
  if (req.path.endsWith('/') && req.path.length > 1) {
    const query = req.url.slice(req.path.length);
    const safePath = req.path.slice(0, -1).replace(/\/+/g, '/');
    res.redirect(301, safePath + query);
    return;
  }

  next();
});

app.use(compression());

// https://expressjs.com/en/advanced/best-practice-security.html#reduce-fingerprinting
app.disable('x-powered-by');

// Remix fingerprints its assets so we can cache forever.
app.use(
  '/build',
  express.static('public/build', { immutable: true, maxAge: '1y' }),
);

// Everything else (like favicon.ico) is cached for less than forever but still
// a long time.
app.use(express.static('public', { maxAge: '1d' }));

app.use(
  morgan('tiny', {
    skip: (req, res) => req.url === '/_/healthcheck',
  }),
);

app.all(
  '*',
  isDev
    ? createDevRequestHandler()
    : createRequestHandler({
        build,
        mode: process.env.NODE_ENV,
      }),
);

const port = process.env.PORT || 3000;

primeContentCacheIfAppropriate().then(() => {
  app.listen(port, () => {
    console.log(`✅ app ready: http://localhost:${port}`);
    // in dev, call `broadcastDevReady` _after_ your server is up and running
    if (isDev) broadcastDevReady(build);
  });
});

async function primeContentCacheIfAppropriate() {
  // If LiteFS is present (i.e., when running on Fly), we only want to prime the
  // content cache on the primary instance. If LiteFS is not present (i.e., when
  // running locally), we always want to prime the content cache.
  if (process.env.LITEFS_DIR) {
    const { currentIsPrimary } = await getInstanceInfo();
    if (currentIsPrimary) await primeContentCache();
  } else {
    await primeContentCache();
  }
}

function createDevRequestHandler() {
  // initial build
  /**
   * @type { import('@remix-run/node').ServerBuild | Promise<import('@remix-run/node').ServerBuild> }
   */
  let devBuild = build;

  const watcher = chokidar.watch(BUILD_PATH, { ignoreInitial: true });

  watcher.on('all', async () => {
    // 1. purge require cache && load updated server build
    const stat = fs.statSync(BUILD_PATH);
    devBuild = import(
      BUILD_PATH + '?t=' + stat.mtimeMs
    ) as unknown as ServerBuild;
    // 2. tell dev server that this app server is now ready
    broadcastDevReady(await devBuild);
  });

  const devRequestHandler: express.RequestHandler = async (req, res, next) => {
    try {
      return createRequestHandler({
        build: await devBuild,
        mode: 'development',
      })(req, res, next);
    } catch (error) {
      next(error);
    }
  };

  return devRequestHandler;
}
