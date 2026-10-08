import { run } from "remix/component";
import { supportsMultipleImportMaps } from "./import-map-support.ts";
const app = run({
  async loadModule(moduleUrl, exportName) {
    const module = (await supportsMultipleImportMaps)
      ? await import(moduleUrl)
      : await (await import("remix/multiple-import-maps-polyfill")).importModule(moduleUrl);
    const component = module[exportName];
    if (typeof component !== "function")
      throw new Error(`Unknown component: ${moduleUrl}#${exportName}`);
    return component;
  },
  async processClientEntryPreloads(preloads) {
    if (await supportsMultipleImportMaps) return preloads;
    const polyfill = await import("remix/multiple-import-maps-polyfill");
    if (await polyfill.detectMultipleImportMapSupport()) return preloads;
    await polyfill.preloadShim(preloads);
    return [];
  },
});
app.addEventListener("error", (event) => {
  console.error("Remix browser runtime failed", event.error);
  // Native frame loads reject 5xx HTML. Navigate the document to show the route's error page.
  if (
    event.error instanceof Error &&
    /^Failed to resolve frame: 5\d{2}\b/.test(event.error.message)
  ) {
    const destination = app.frames.top.src;
    const searchFrame = app.frames.get("search-results");
    window.location.assign(
      searchFrame &&
        new URL(destination, window.location.href).pathname ===
          new URL(searchFrame.src, window.location.href).pathname
        ? searchFrame.src
        : destination,
    );
  }
});
await app.ready();
document.documentElement.dataset.remixReady = "true";
if ("serviceWorker" in navigator)
  void navigator.serviceWorker.register("/sw.js").catch((error) => {
    console.error("Service worker registration failed", error);
  });
