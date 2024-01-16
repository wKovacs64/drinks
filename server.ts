import * as fs from 'node:fs';
import * as url from 'node:url';
import { createRequestHandler } from '@remix-run/express';
import { installGlobals } from '@remix-run/node';
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

const viteDevServer =
  process.env.NODE_ENV === 'production'
    ? undefined
    : await import('vite').then((vite) =>
        vite.createServer({
          server: { middlewareMode: true },
        }),
      );

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

// handle asset requests
if (viteDevServer) {
  app.use(viteDevServer.middlewares);
} else {
  // Remix fingerprints its assets so we can cache forever.
  app.use(
    '/assets',
    express.static('build/client/assets', { immutable: true, maxAge: '1y' }),
  );
}

// Everything else (like favicon.ico) is cached for less than forever but still
// a long time.
app.use(express.static('build/client', { maxAge: '1d' }));

app.use(
  morgan('tiny', {
    skip: (req) =>
      req.url === '/_/healthcheck' ||
      Boolean(req.headers['x-from-healthcheck']),
  }),
);

app.all(
  '*',
  createRequestHandler({
    // @ts-ignore - might be able to remove this if Remix figures out types here
    build: viteDevServer
      ? () => viteDevServer.ssrLoadModule('virtual:remix/server-build')
      : // @ts-ignore - server build output may not always be there
        await import('./build/server/index.js'),
  }),
);

await primeContentCacheIfAppropriate();

const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`✅ app ready: http://localhost:${port}`);
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
