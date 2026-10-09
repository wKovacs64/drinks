import { cpSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { build } from "esbuild";
mkdirSync("public/images", { recursive: true });
mkdirSync("public/fonts", { recursive: true });
cpSync("app/assets/images", "public/images", { recursive: true });
for (const weight of [300, 400]) {
  const filename = `source-sans-3-latin-${weight}-normal.woff2`;
  cpSync(`node_modules/@fontsource/source-sans-3/files/${filename}`, `public/fonts/${filename}`);
}
const icons = readdirSync("app/assets/svg-icons").filter((file) => file.endsWith(".svg"));
const symbols = icons.map((filename) => {
  const svg = readFileSync(`app/assets/svg-icons/${filename}`, "utf8");
  return svg
    .replace(/<\?xml[^>]*>/g, "")
    .replace(
      /<svg([^>]*)>/,
      (_, attributes: string) =>
        `<symbol id="${filename.replace(/\.svg$/, "")}"${attributes.replace(/\sxmlns="[^"]*"/g, "")}>`,
    )
    .replace(/<\/svg>/, "</symbol>");
});
writeFileSync(
  "public/icons-sprite.svg",
  `<svg xmlns="http://www.w3.org/2000/svg">${symbols.join("")}</svg>`,
);
writeFileSync(
  "public/sw.js",
  `self.addEventListener('install', event => event.waitUntil(self.skipWaiting()));\nself.addEventListener('activate', event => event.waitUntil(Promise.all([caches.keys().then(keys => Promise.all(keys.map(key => caches.delete(key)))), self.clients.claim()])));\n`,
);
// Bundle the shared Drink summary and MCP Apps bridge without the website runtime.
await build({
  entryPoints: ["app/integrations/mcp/public/card.tsx"],
  outfile: "public/mcp-card.js",
  bundle: true,
  platform: "browser",
  format: "esm",
  minify: true,
});
