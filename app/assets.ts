import { createAssetServer } from "remix/assets";
import { loadConfig } from "remix/cli";
import { componentHmr } from "remix/component-hmr/assets";
import type { EntryComponent } from "remix/component";
const isDevelopment = process.env.NODE_ENV === "development";
const browserHmrChannel =
  isDevelopment && process.env.REMIX_NODE_HMR === "1"
    ? await (await import("remix/node-hmr/runtime")).createBrowserHmrChannel()
    : undefined;
const { assets: assetConfig } = await loadConfig();
if (!assetConfig) throw new Error("Missing Remix asset configuration");
const hmrEventsPath = `${assetConfig.basePath}/__remix_hmr/events`;
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
const productionScriptEntries = new Map<string, ReturnType<typeof assets.getScriptEntry>>();
function getScriptEntry(sourceId: string) {
  if (process.env.NODE_ENV !== "production") return assets.getScriptEntry(sourceId);
  const cached = productionScriptEntries.get(sourceId);
  if (cached) return cached;
  // Production sources are immutable until restart; development must still resolve live entries.
  const entry = assets.getScriptEntry(sourceId);
  productionScriptEntries.set(sourceId, entry);
  void entry.catch(() => {
    if (productionScriptEntries.get(sourceId) === entry) productionScriptEntries.delete(sourceId);
  });
  return entry;
}
export const scriptEntry = await getScriptEntry("app/ui/public/entry.ts");
export const stylesheetHref = await assets.getHref("public/app.css");
export const cropStylesheetHref = await assets.getHref("public/image-crop.css");
export const lightFontHref = await assets.getHref(
  "public/fonts/source-sans-3-latin-300-normal.woff2",
);
export const preloadAfterPaintHref = await assets.getHref("app/ui/public/preload-after-paint.ts");
export const renderAssets: Pick<typeof assets, "getScriptEntry"> = {
  async getScriptEntry(sourceId) {
    const entry = await getScriptEntry(sourceId);
    // Document schedules low-priority hints after paint; native module URLs and maps stay intact.
    return { ...entry, preloads: [] };
  },
};

export async function getClientEntryPreloads(entry: Pick<EntryComponent, "$entryId">) {
  const hashIndex = entry.$entryId.lastIndexOf("#");
  const sourceId = hashIndex === -1 ? entry.$entryId : entry.$entryId.slice(0, hashIndex);
  const clientEntry = await getScriptEntry(sourceId);
  return [...new Set([...scriptEntry.preloads, ...clientEntry.preloads])];
}

export async function fetchHmrEvents(request: Request): Promise<Response | undefined> {
  if (!browserHmrChannel || new URL(request.url).pathname !== hmrEventsPath) return undefined;
  const response = await fetch(browserHmrChannel.url, { signal: request.signal });
  return new Response(response.body, {
    status: response.status,
    headers: response.headers,
  });
}
