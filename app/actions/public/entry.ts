import { run } from "remix/component";
import type * as MultipleImportMapsPolyfill from "remix/multiple-import-maps-polyfill";
import { supportsMultipleImportMaps } from "./import-map-support.ts";

type ModuleNamespace = Awaited<ReturnType<typeof MultipleImportMapsPolyfill.importModule>>;

type Component = (...args: never[]) => void;

function isModuleNamespace(value: unknown): value is ModuleNamespace {
  return typeof value === "object" && value !== null;
}

function isComponent(value: unknown): value is Component {
  return typeof value === "function";
}

const app = run({
  async loadModule(moduleUrl, exportName) {
    const module: unknown = (await supportsMultipleImportMaps)
      ? await import(moduleUrl)
      : await (await import("remix/multiple-import-maps-polyfill")).importModule(moduleUrl);

    if (!isModuleNamespace(module)) throw new Error(`Unknown module: ${moduleUrl}`);

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

function isFrameRejectionOfServerErrorPage(errorMessage: string) {
  return /^Failed to resolve frame: 5\d{2}\b/.test(errorMessage);
}

function showServerErrorPageAsDocument() {
  window.location.assign(app.frames.top.src);
}

app.addEventListener("error", (event) => {
  console.error("Remix browser runtime failed", event.error);

  if (event.error instanceof Error && isFrameRejectionOfServerErrorPage(event.error.message))
    showServerErrorPageAsDocument();
});

await app.ready();

document.documentElement.dataset.remixReady = "true";
