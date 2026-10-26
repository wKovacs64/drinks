import { createAssetServer } from "remix/assets";
import { loadConfig } from "remix/cli";
import { componentHmr } from "remix/component-hmr/assets";
import { createMatcher } from "remix/route-pattern/match";
import type { EntryComponent } from "remix/component";
const isDevelopment = process.env.NODE_ENV === "development";
const browserHmrChannel =
  isDevelopment && process.env.REMIX_NODE_HMR === "1"
    ? await (await import("remix/node-hmr/runtime")).createBrowserHmrChannel()
    : undefined;
const { assets: assetConfig } = await loadConfig();
if (!assetConfig) throw new Error("Missing Remix asset configuration");
const hmrEventsPath = `${assetConfig.basePath}/__remix_hmr/events`;
const hmrEventsMatcher = createMatcher(hmrEventsPath);
export const hmrClientHref = browserHmrChannel
  ? `${assetConfig.basePath}/__remix_hmr/client.js`
  : undefined;
export const assets = createAssetServer({
  ...assetConfig,
  sourceMaps: "external",
  watch: isDevelopment,
  minify: !isDevelopment,
  fingerprint: process.env.NODE_ENV === "production",
  hmr: browserHmrChannel
    ? {
        // Serve the EventSource on the app origin, including LAN/collaborative previews.
        channel: () => ({ ...browserHmrChannel, url: hmrEventsPath }),
        moduleImporter: "remix/multiple-import-maps-polyfill",
      }
    : undefined,
  scripts: { loaders: isDevelopment ? [componentHmr()] : undefined },
  files: { extensions: [".woff2", ".jpg"] },
  onError: (error) => console.error("Remix asset compilation failed", error),
});
export const scriptEntry = await assets.getScriptEntry("app/actions/public/entry.ts");
export const stylesheetHref = await assets.getHref("public/app.css");
export const lightFontHref = await assets.getHref(
  "public/fonts/source-sans-3-latin-300-normal.woff2",
);
export const preloadAfterPaintHref = await assets.getHref(
  "app/actions/public/preload-after-paint.ts",
);
export const renderAssets: Pick<typeof assets, "getScriptEntry"> = {
  async getScriptEntry(sourceId) {
    const entry = await assets.getScriptEntry(sourceId);
    // Document schedules low-priority hints after paint; native module URLs and maps stay intact.
    return { ...entry, preloads: [] };
  },
};

export async function getClientEntryPreloads(entry: Pick<EntryComponent, "$entryId">) {
  const hashIndex = entry.$entryId.lastIndexOf("#");
  const sourceId = hashIndex === -1 ? entry.$entryId : entry.$entryId.slice(0, hashIndex);
  const clientEntry = await assets.getScriptEntry(sourceId);
  return [...new Set([...scriptEntry.preloads, ...clientEntry.preloads])];
}

export async function fetchHmrEvents(request: Request): Promise<Response | undefined> {
  if (!browserHmrChannel || hmrEventsMatcher.match(request.url) === null) return undefined;
  const response = await fetch(browserHmrChannel.url, { signal: request.signal });
  return new Response(response.body, {
    status: response.status,
    headers: response.headers,
  });
}
