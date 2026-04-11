import path from "node:path";
import { cpSync } from "node:fs";
import tailwindcss from "@tailwindcss/vite";
import { reactRouterHonoServer } from "react-router-hono-server/dev";
import { reactRouter } from "@react-router/dev/vite";
import { defineConfig, type Plugin } from "vite";
import { iconsSpritesheet } from "vite-plugin-icons-spritesheet";
import babel from "@rolldown/plugin-babel";
import { reactCompilerPreset } from "@vitejs/plugin-react";

export default defineConfig({
  build: {
    target: "esnext",
  },
  plugins: [
    tailwindcss(),
    reactRouterHonoServer(),
    iconsSpritesheet({
      inputDir: path.resolve("./app/assets/svg-icons"),
      outputDir: path.resolve("./app/ui/icons"),
      fileName: "icons-sprite.svg",
      iconNameTransformer: (fileName) => fileName,
      withTypes: true,
    }),
    reactRouter(),
    babel({
      presets: [reactCompilerPreset()],
    }),
    copyFaviconPlugin(),
  ],
});

function copyFaviconPlugin(): Plugin {
  return {
    name: "copy-favicon",
    writeBundle() {
      if (this.environment && this.environment.name !== "client") return;
      cpSync("app/assets/images/favicon.ico", "build/client/favicon.ico");
    },
  };
}
