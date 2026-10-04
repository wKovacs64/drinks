import { createAssetServer } from "remix/assets";
import { loadConfig } from "remix/cli";
import { componentHmr } from "remix/component-hmr/assets";
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
  onError: (error) => console.error("Remix asset compilation failed", error),
});
export const scriptEntry = await assets.getScriptEntry("app/ui/public/entry.ts");
export const stylesheetHref = await assets.getHref("public/app.css");

export async function fetchHmrEvents(request: Request): Promise<Response | undefined> {
  if (!browserHmrChannel || new URL(request.url).pathname !== hmrEventsPath) return undefined;
  const response = await fetch(browserHmrChannel.url, { signal: request.signal });
  return new Response(response.body, {
    status: response.status,
    headers: response.headers,
  });
}
