import { test } from "remix/test";
import { expect } from "remix/assert";
import { createBrowserPage } from "#/test/e2e.ts";

test("native module loading hydrates and navigates without a compatibility iframe", async (context) => {
  const page = await createBrowserPage(context);
  await page.addInitScript(() => {
    const createElement = document.createElement.bind(document);
    Reflect.set(window, "compatibilityIframes", 0);
    document.createElement = (tagName: string, options?: ElementCreationOptions) => {
      if (tagName.toLowerCase() === "iframe") {
        Reflect.set(
          window,
          "compatibilityIframes",
          Reflect.get(window, "compatibilityIframes") + 1,
        );
      }
      return createElement(tagName, options);
    };
  });
  await page.goto("/");
  await page.waitForFunction(() => document.documentElement.dataset.remixReady === "true");
  expect(await page.evaluate(() => Reflect.get(window, "compatibilityIframes"))).toBe(0);
  await page.getByRole("link", { name: "Search", exact: true }).click();
  await page.waitForURL("/search");
  const input = page.getByRole("textbox", { name: "Search Term" });
  await input.fill("tequila");
  await input.press("Enter");
  await page.getByRole("heading", { name: "Test Margarita", exact: true }).waitFor();
  expect(await page.evaluate(() => Reflect.get(window, "compatibilityIframes"))).toBe(0);
});

test("single-import-map browsers retain polyfilled hydration and late client entries", async (context) => {
  const page = await createBrowserPage(context);
  let polyfillLoaded = false;
  await page.route("**/features*.js", async (route) => {
    polyfillLoaded = true;
    // Supply the capability result an older browser's isolated probe returns.
    await route.fulfill({
      contentType: "text/javascript",
      body: "export const supportsImportMaps = true; export const supportsMultipleImportMaps = false; export const featureDetectionPromise = Promise.resolve();",
    });
  });
  await page.addInitScript(() => {
    const appendChild = Node.prototype.appendChild;
    Node.prototype.appendChild = function <T extends Node>(this: Node, node: T): T {
      if (
        this === document.head &&
        node instanceof HTMLScriptElement &&
        node.type === "importmap"
      ) {
        // Leave late maps available to Remix, but prevent native installation.
        node.type = "application/json";
        appendChild.call(this, node);
        node.type = "importmap";
        return node;
      }
      appendChild.call(this, node);
      return node;
    };
  });
  await page.goto("/");
  await page.waitForFunction(() => document.documentElement.dataset.remixReady === "true");
  expect(polyfillLoaded).toBe(true);
  await page.getByRole("link", { name: "Search", exact: true }).click();
  await page.waitForURL("/search");
  const input = page.getByRole("textbox", { name: "Search Term" });
  await input.fill("tequila");
  await input.press("Enter");
  await page.getByRole("heading", { name: "Test Margarita", exact: true }).waitFor();
});

test("deferred module hints yield to other tasks before the full graph is inserted", async (context) => {
  const page = await createBrowserPage(context);
  await page.addInitScript(() => {
    const observer = new MutationObserver(() => {
      if (!document.querySelector('link[rel="modulepreload"][fetchpriority="low"]')) return;
      observer.disconnect();
      setTimeout(() => {
        const template = document.getElementById("client-module-preloads");
        document.documentElement.dataset.preloadsYielded = String(
          template instanceof HTMLTemplateElement && template.content.childElementCount > 0,
        );
      }, 0);
    });
    observer.observe(document, { childList: true, subtree: true });
  });
  await page.goto("/");
  await page.waitForFunction(() => document.documentElement.dataset.preloadsYielded !== undefined);
  expect(await page.evaluate(() => document.documentElement.dataset.preloadsYielded)).toBe("true");
  await page.locator("#client-module-preloads").waitFor({ state: "detached" });
  await page.waitForFunction(() => document.documentElement.dataset.remixReady === "true");
});
