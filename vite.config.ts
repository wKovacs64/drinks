import path from 'node:path';
import { vitePlugin as remix } from '@remix-run/dev';
import { unstable_RemixPWA as remixPwa } from '@remix-pwa/dev';
import { defineConfig, normalizePath } from 'vite';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import tsConfigPaths from 'vite-tsconfig-paths';

const outputDir = normalizePath(path.resolve('./build/client'));

export default defineConfig({
  build: {
    // Our SVG icons sprite is smaller than the default limit of 4096, so it
    // gets inlined as a data URL, which is not what we want.
    assetsInlineLimit: 2048,
  },
  optimizeDeps: {
    holdUntilCrawlEnd: true,
  },
  plugins: [
    remix({
      future: {
        v3_fetcherPersist: true,
        v3_relativeSplatPath: true,
        v3_throwAbortReason: true,
      },
    }),
    remixPwa({
      workerName: 'sw',
      workerMinify: true,
      workerBuildDirectory: outputDir,
    }),
    viteStaticCopy({
      targets: [
        {
          src: 'app/images/favicon.ico',
          dest: outputDir,
        },
      ],
    }),
    tsConfigPaths(),
  ],
});
