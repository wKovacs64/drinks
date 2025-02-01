import path from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import { reactRouterHonoServer } from 'react-router-hono-server/dev';
import { reactRouter } from '@react-router/dev/vite';
import { defineConfig, normalizePath } from 'vite';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import tsConfigPaths from 'vite-tsconfig-paths';
import { iconsSpritesheet } from 'vite-plugin-icons-spritesheet';

export default defineConfig({
  build: {
    target: 'esnext',
  },
  esbuild: {
    supported: {
      'top-level-await': true,
    },
  },
  plugins: [
    tailwindcss(),
    reactRouterHonoServer(),
    iconsSpritesheet({
      inputDir: path.resolve('./app/assets/svg-icons'),
      outputDir: path.resolve('./app/icons'),
      fileName: 'icons-sprite.svg',
      iconNameTransformer: (fileName) => fileName,
      withTypes: true,
    }),
    reactRouter(),
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
