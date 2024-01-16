import * as fs from 'node:fs';
import * as path from 'node:path';
import * as url from 'node:url';
import { createRequestHandler, type RequestHandler } from '@remix-run/express';
import {
  broadcastDevReady,
  installGlobals,
  type ServerBuild,
} from '@remix-run/node';
import compression from 'compression';
import express from 'express';
import morgan from 'morgan';
import sourceMapSupport from 'source-map-support';
import { getInstanceInfo } from 'litefs-js';
import { primeContentCache } from '~/utils/prime-content-cache.server';

sourceMapSupport.install({
  retrieveSourceMap: function (source) {
    const match = source.startsWith('file://');
    if (match) {
      const filePath = url.fileURLToPath(source);
      const sourceMapPath = `${filePath}.map`;
      if (fs.existsSync(sourceMapPath)) {
        return {
          url: source,
          map: fs.readFileSync(sourceMapPath, 'utf8'),
        };
      }
    }
    return null;
  },
});
installGlobals();

const BUILD_PATH = path.resolve('build/index.js');
const VERSION_PATH = path.resolve('build/version.txt');

const initialBuild: ServerBuild = await reimportServer();
const remixHandler =
  process.env.NODE_ENV === 'development'
    ? await createDevRequestHandler(initialBuild)
    : createRequestHandler({
        build: initialBuild,
        mode: initialBuild.mode,
      });

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
    // TODO: figure out a way to make this work in development with Remix dev
    // server
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
    skip: (req) =>
      req.url === '/_/healthcheck' ||
      Boolean(req.headers['x-from-healthcheck']),
  }),
);

app.all('*', remixHandler);

const port = process.env.PORT || 3000;

primeContentCacheIfAppropriate().then(() => {
  app.listen(port, () => {
    console.log(`✅ app ready: http://localhost:${port}`);
    // in dev, call `broadcastDevReady` _after_ your server is up and running
    if (isDev) broadcastDevReady(initialBuild);
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

async function reimportServer(): Promise<ServerBuild> {
  const stat = fs.statSync(BUILD_PATH);

  // convert build path to URL for Windows compatibility with dynamic `import`
  const BUILD_URL = url.pathToFileURL(BUILD_PATH).href;

  // use a timestamp query parameter to bust the import cache
  return import(BUILD_URL + '?t=' + stat.mtimeMs);
}

async function createDevRequestHandler(initialBuild: ServerBuild) {
  let build = initialBuild;
  async function handleServerUpdate() {
    // 1. re-import the server build
    build = await reimportServer();
    // 2. tell Remix that this app server is now up-to-date and ready
    broadcastDevReady(build);
  }
  const chokidar = await import('chokidar');
  chokidar
    .watch(VERSION_PATH, { ignoreInitial: true })
    .on('add', handleServerUpdate)
    .on('change', handleServerUpdate);

  // wrap request handler to make sure its recreated with the latest build for every request
  const requestHandler: RequestHandler = async (req, res, next) => {
    try {
      return createRequestHandler({
        build,
        mode: 'development',
      })(req, res, next);
    } catch (error) {
      next(error);
    }
  };

  return requestHandler;
}
