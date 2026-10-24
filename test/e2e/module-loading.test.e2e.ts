import { test } from "remix/test";
import { expect } from "remix/assert";
import { createBrowserPage } from "#/test/e2e.ts";

for (const singleImportMap of [false, true]) {
  test(`Search hydrates after navigation (${singleImportMap ? "single import map" : "native import maps"})`, async (context) => {
    const page = await createBrowserPage(context);
    if (singleImportMap) {
      await page.route("**/features*.js", async (route) => {
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
    }
    await page.goto("/");
    await page.waitForFunction(() => document.documentElement.dataset.remixReady === "true");
    await page.getByRole("link", { name: "Search", exact: true }).click();
    await page.waitForURL("/search");
    const input = page.getByRole("textbox", { name: "Search Term" });
    await page.waitForFunction(() => document.activeElement?.getAttribute("name") === "q");
    await input.fill("tequila");
    await input.press("Enter");
    await page.getByRole("heading", { name: "Test Margarita", exact: true }).waitFor();
    await input.press("Escape");
    expect(await input.inputValue()).toBe("");
  });
}
