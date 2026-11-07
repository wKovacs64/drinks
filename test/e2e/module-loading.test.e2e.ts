import { test } from "remix/test";
import { expect } from "remix/assert";
import { createBrowserPage } from "#/test/e2e.ts";
import { assets } from "#/app/assets.ts";

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

async function getModulePreloads(
  page: Awaited<ReturnType<typeof createBrowserPage>>,
  path: string,
) {
  const html = await (await page.request.get(path)).text();
  return page.evaluate((documentHtml) => {
    const parsed = new DOMParser().parseFromString(documentHtml, "text/html");
    const template = parsed.getElementById("client-module-preloads");
    const [head, deferred] = [
      parsed.head,
      template instanceof HTMLTemplateElement ? template.content : undefined,
    ].map((root) =>
      Array.from(root?.querySelectorAll('link[rel="modulepreload"]') ?? [], (link) => ({
        href: link.getAttribute("href"),
        framework: link.hasAttribute("data-rmx-module-preload"),
      })),
    );
    return { head, deferred };
  }, html);
}

test("Search defers module hints for its client entries", async (testContext) => {
  const page = await createBrowserPage(testContext);
  const preloads = await getModulePreloads(page, "/search");
  expect(preloads.head).toEqual([]);
  const deferredHrefs = preloads.deferred.map(({ href }) => href);
  for (const sourcePath of [
    "app/actions/public/entry.ts",
    "app/actions/search/public/search-form.tsx",
    "app/actions/search/public/search-status.tsx",
  ]) {
    expect(deferredHrefs).toContain(await assets.getHref(sourcePath));
  }
});

test("Admin pages carry Remix module hints for their client entries", async (testContext) => {
  const page = await createBrowserPage(testContext, { admin: true });
  // The deletion notification renders the Toast client entry.
  await page.request.post("/admin/drinks/test-mojito/delete", { maxRedirects: 0 });
  const preloads = await getModulePreloads(page, "/admin/drinks");
  const headHrefs = preloads.head.filter(({ framework }) => framework).map(({ href }) => href);
  for (const sourcePath of [
    "app/actions/admin/public/toast.tsx",
    "app/actions/admin/drinks/public/admin-drinks-list.tsx",
  ]) {
    expect(headHrefs).toContain(await assets.getHref(sourcePath));
  }
});
