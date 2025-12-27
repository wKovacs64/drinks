import path from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import { reactRouterHonoServer } from 'react-router-hono-server/dev';
import { reactRouter } from '@react-router/dev/vite';
import { defineConfig, normalizePath } from 'vite';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import { iconsSpritesheet } from 'vite-plugin-icons-spritesheet';
import babel from 'vite-plugin-babel';

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
    babel({
      exclude: ['**/node_modules/**'],
      filter: /\.[jt]sx?$/u,
      loader: 'jsx',
      babelConfig: {
        presets: ['@babel/preset-typescript'],
        plugins: [['babel-plugin-react-compiler']],
      },
    }),
    viteStaticCopy({
      targets: [
        {
          src: 'app/assets/images/favicon.ico',
          dest: normalizePath(path.resolve('./build/client')),
        },
      ],
    }),
  ],
});
