import { run } from "remix/component";
import {
  detectMultipleImportMapSupport,
  importModule,
  preloadShim,
} from "remix/multiple-import-maps-polyfill";
const app = run({
  async loadModule(moduleUrl, exportName) {
    const module = await importModule(moduleUrl);
    const component = module[exportName];
    if (typeof component !== "function")
      throw new Error(`Unknown component: ${moduleUrl}#${exportName}`);
    return component;
  },
  async processClientEntryPreloads(preloads) {
    if (await detectMultipleImportMapSupport()) return preloads;
    await preloadShim(preloads);
    return [];
  },
});
app.addEventListener("error", (event) => {
  console.error("Remix browser runtime failed", event.error);
});
await app.ready();
document.documentElement.dataset.remixReady = "true";
if ("serviceWorker" in navigator) void navigator.serviceWorker.register("/sw.js");

// Match the gallery's viewport prefetching with the browser's native document cache.
const prefetched = new Set<string>();
const observer = new IntersectionObserver((entries) => {
  for (const entry of entries) {
    if (!entry.isIntersecting || !(entry.target instanceof HTMLAnchorElement)) continue;
    observer.unobserve(entry.target);
    const href = entry.target.href;
    if (new URL(href).origin !== window.location.origin || prefetched.has(href)) continue;
    prefetched.add(href);
    const preload = document.createElement("link");
    preload.rel = "prefetch";
    preload.href = href;
    preload.as = "document";
    document.head.append(preload);
  }
});
function observeLinks(root: ParentNode) {
  for (const anchor of root.querySelectorAll('a[data-prefetch="viewport"]'))
    observer.observe(anchor);
}
observeLinks(document);
new MutationObserver((mutations) => {
  for (const mutation of mutations)
    for (const node of mutation.addedNodes) {
      if (!(node instanceof Element)) continue;
      if (node.matches('a[data-prefetch="viewport"]')) observer.observe(node);
      observeLinks(node);
    }
}).observe(document.body, { childList: true, subtree: true });
