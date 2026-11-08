import { run } from "remix/component";
import type * as MultipleImportMapsPolyfill from "remix/multiple-import-maps-polyfill";
import { supportsMultipleImportMaps } from "./import-map-support.ts";

type ModuleNamespace = Awaited<ReturnType<typeof MultipleImportMapsPolyfill.importModule>>;

type Component = (...args: never[]) => void;

function isComponent(value: unknown): value is Component {
  return typeof value === "function";
}

const app = run({
  async loadModule(moduleUrl, exportName) {
    // SAFETY: `import()` resolves to the module's namespace object, the same shape the polyfill returns.
    const module = (await supportsMultipleImportMaps)
      ? ((await import(moduleUrl)) as ModuleNamespace)
      : await (await import("remix/multiple-import-maps-polyfill")).importModule(moduleUrl);

    const component = module[exportName];

    if (!isComponent(component)) throw new Error(`Unknown component: ${moduleUrl}#${exportName}`);

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
    window.location.assign(app.frames.top.src);
  }
});

await app.ready();

document.documentElement.dataset.remixReady = "true";
