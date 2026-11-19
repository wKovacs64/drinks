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

const appOriginHmrEventsPath = `${assetConfig.basePath}/__remix_hmr/events`;
const hmrEventsMatcher = createMatcher(appOriginHmrEventsPath);

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
        channel: () => ({ ...browserHmrChannel, url: appOriginHmrEventsPath }),
        moduleImporter: "remix/multiple-import-maps-polyfill",
      }
    : undefined,
  scripts: { loaders: isDevelopment ? [componentHmr()] : undefined },
  files: { extensions: [".woff2", ".jpg"] },
  onError: (error) => console.error("Remix asset compilation failed", error),
});

const scriptEntrySourceId = "app/actions/public/entry.ts";
export const scriptEntry = await assets.getScriptEntry(scriptEntrySourceId);
export const stylesheetHref = await assets.getHref("public/app.css");

export const lightFontHref = await assets.getHref(
  "public/fonts/source-sans-3-latin-300-normal.woff2",
);

export const preloadAfterPaintHref = await assets.getHref(
  "app/actions/public/preload-after-paint.ts",
);

const adminSourceUrl = new URL("actions/admin/", import.meta.url).href;

export const renderAssets: Pick<typeof assets, "getScriptEntry"> = {
  async getScriptEntry(sourceId) {
    const entry = await assets.getScriptEntry(sourceId);

    const keepsEagerHeadPreloads = sourceId.startsWith(adminSourceUrl);

    return keepsEagerHeadPreloads ? entry : { ...entry, preloads: [] };
  },
};

export function getModulePreloads(...entries: Pick<EntryComponent, "$entryId">[]) {
  return assets.getPreloads([
    scriptEntrySourceId,
    ...entries.map(({ $entryId }) => {
      const hashIndex = $entryId.lastIndexOf("#");

      return hashIndex === -1 ? $entryId : $entryId.slice(0, hashIndex);
    }),
  ]);
}

export async function fetchHmrEvents(request: Request): Promise<Response | undefined> {
  if (!browserHmrChannel || hmrEventsMatcher.match(request.url) === null) return undefined;
  const response = await fetch(browserHmrChannel.url, { signal: request.signal });

  return new Response(response.body, {
    status: response.status,
    headers: response.headers,
  });
}
