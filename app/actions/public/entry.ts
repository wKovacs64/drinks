import { routes } from "#/app/routes.ts";
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
  // Native frame loads reject 5xx HTML. Navigate the document to show the route's error page.
  if (
    event.error instanceof Error &&
    /^Failed to resolve frame: 5\d{2}\b/.test(event.error.message)
  ) {
    const destination = app.frames.top.src;
    const searchFrame = app.frames.get("search-results");
    window.location.assign(
      new URL(destination, window.location.href).pathname === routes.search.index.href() &&
        searchFrame
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

// Match the gallery's viewport prefetching with the browser's native document cache.
const prefetched = new Set<string>();
const waitingForPhotos = new WeakMap<HTMLAnchorElement, AbortController>();
const observer = new IntersectionObserver((entries) => {
  for (const entry of entries) {
    if (!entry.isIntersecting || !(entry.target instanceof HTMLAnchorElement)) continue;
    observer.unobserve(entry.target);
    const href = entry.target.href;
    if (new URL(href).origin !== window.location.origin || prefetched.has(href)) continue;
    const anchor = entry.target;
    const image = anchor.querySelector("img");
    if (image && !image.complete) {
      if (waitingForPhotos.has(anchor)) continue;
      const controller = new AbortController();
      waitingForPhotos.set(anchor, controller);
      const observeAfterPhoto = () => {
        waitingForPhotos.delete(anchor);
        controller.abort();
        if (anchor.isConnected) observer.observe(anchor);
      };
      image.addEventListener("load", observeAfterPhoto, { signal: controller.signal });
      image.addEventListener("error", observeAfterPhoto, { signal: controller.signal });
      continue;
    }
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
function stopObservingLink(anchor: Element) {
  observer.unobserve(anchor);
  if (anchor instanceof HTMLAnchorElement) {
    waitingForPhotos.get(anchor)?.abort();
    waitingForPhotos.delete(anchor);
  }
}
observeLinks(document);
new MutationObserver((mutations) => {
  for (const mutation of mutations) {
    for (const node of mutation.removedNodes) {
      if (!(node instanceof Element) || node.isConnected) continue;
      if (node.matches('a[data-prefetch="viewport"]')) stopObservingLink(node);
      for (const anchor of node.querySelectorAll('a[data-prefetch="viewport"]'))
        stopObservingLink(anchor);
    }
    for (const node of mutation.addedNodes) {
      if (!(node instanceof Element)) continue;
      if (node.matches('a[data-prefetch="viewport"]')) observer.observe(node);
      observeLinks(node);
    }
  }
}).observe(document.body, { childList: true, subtree: true });
