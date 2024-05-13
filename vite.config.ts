import path from 'node:path';
import { vitePlugin as remix } from '@remix-run/dev';
import { remixPWA } from '@remix-pwa/dev';
import { defineConfig, normalizePath } from 'vite';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import tsConfigPaths from 'vite-tsconfig-paths';
import { iconsSpritesheet } from 'vite-plugin-icons-spritesheet';

export default defineConfig({
  build: {
    // Our SVG icons sprite is smaller than the default limit of 4096, so it
    // gets inlined as a data URL, which is not what we want.
    assetsInlineLimit: 2048,
  },
  optimizeDeps: {
    include: ['algoliasearch', 'clsx', 'lodash-es'],
  },
  plugins: [
    iconsSpritesheet({
      inputDir: path.resolve('./app/assets/svg-icons'),
      outputDir: path.resolve('./app/icons'),
      fileName: 'icons-sprite.svg',
      iconNameTransformer: (fileName) => fileName,
      withTypes: true,
    }),
    remix({
      future: {
        v3_fetcherPersist: true,
        v3_relativeSplatPath: true,
        v3_throwAbortReason: true,
      },
    }),
    remixPWA({
      // Note to self: don't use normalizePath/path.resolve here 🤷‍♂️
      workerBuildDirectory: 'build/client',
      workerName: 'sw',
      workerMinify: true,
    }),
    viteStaticCopy({
      targets: [
        {
          src: 'app/assets/images/favicon.ico',
          dest: normalizePath(path.resolve('./build/client')),
        },
      ],
    }),
    tsConfigPaths(),
  ],
});
