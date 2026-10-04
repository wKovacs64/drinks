import { test } from "remix/test";
import { expect } from "remix/assert";
import { createBrowserPage } from "#/test/e2e.ts";

test("search focuses, shows pending feedback, finds drinks, and clears with Escape", async (testContext) => {
  const page = await createBrowserPage(testContext);
  await page.goto("/search");
  await page.waitForFunction(() => document.documentElement.dataset.remixReady === "true");
  const input = page.getByRole("textbox", { name: "Search Term" });
  expect(await input.evaluate((element) => element === document.activeElement)).toBe(true);
  await page.route("**/search?q=tequila", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 700));
    await route.continue();
  });
  await input.fill("tequila");
  await input.press("Enter");
  await page.getByText("Searching . . .", { exact: true }).waitFor();
  await page.getByRole("heading", { name: "Test Margarita" }).waitFor();
  expect(await page.getByRole("article").count()).toBe(1);
  await input.press("Escape");
  expect(await input.inputValue()).toBe("");
  expect(await input.evaluate((element) => element === document.activeElement)).toBe(true);
});

test("tags and drink details retain their navigation and contents", async (testContext) => {
  const page = await createBrowserPage(testContext);
  await page.goto("/tags");
  await page.getByRole("link", { name: "tequila", exact: true }).click();
  await page.waitForURL("/tags/tequila");
  await page.getByRole("heading", { name: "Test Margarita", level: 2 }).waitFor();
  expect(await page.getByRole("article").count()).toBe(1);
  await page.getByRole("link", { name: "Test Margarita", exact: true }).click();
  await page.waitForURL("/test-margarita");
  await page.getByText("A classic test margarita").waitFor();
  await page.getByText("2 oz tequila", { exact: true }).waitFor();
  await page.goBack();
  await page.waitForURL("/tags/tequila");
  await page.getByRole("heading", { name: "Test Margarita", level: 2 }).waitFor();
});

test("search preserves results through repeated queries, empty results, and history", async (testContext) => {
  const page = await createBrowserPage(testContext);
  await page.goto("/search?q=tequila");
  await page.waitForFunction(() => document.documentElement.dataset.remixReady === "true");
  await page.getByRole("heading", { name: "Test Margarita", exact: true }).waitFor();
  const input = page.getByRole("textbox", { name: "Search Term" });
  await input.fill("mint");
  await input.press("Enter");
  await page.getByRole("heading", { name: "Test Mojito", exact: true }).waitFor();
  expect(await page.getByRole("heading", { name: "Test Margarita", exact: true }).count()).toBe(0);
  await input.fill("no-matching-drink");
  await input.press("Enter");
  await page.getByText("No matching drinks found.", { exact: true }).waitFor();
  expect(await page.getByRole("article").count()).toBe(0);
  await page.goBack();
  await page.getByRole("heading", { name: "Test Mojito", exact: true }).waitFor();
  await page.goBack();
  await page.getByRole("heading", { name: "Test Margarita", exact: true }).waitFor();
});

test("visible photos finish loading before speculative drink navigation downloads", async (testContext) => {
  const page = await createBrowserPage(testContext);
  const releasePhoto = Promise.withResolvers<void>();
  const drinkPrefetched = Promise.withResolvers<void>();
  let prefetchRequests = 0;
  await page.route("**/slow-photo.svg", async (route) => {
    await releasePhoto.promise;
    await route.fulfill({
      contentType: "image/svg+xml",
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/>',
    });
  });
  await page.route("**/test-margarita", async (route) => {
    prefetchRequests++;
    drinkPrefetched.resolve();
    await route.continue();
  });
  await page.addInitScript(() => {
    const observer = new MutationObserver(() => {
      const image = document.querySelector('img[alt="Test Margarita"]');
      if (!(image instanceof HTMLImageElement)) return;
      observer.disconnect();
      image.src = "/slow-photo.svg";
    });
    observer.observe(document, { childList: true, subtree: true });
  });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => document.documentElement.dataset.remixReady === "true");
  await page.waitForTimeout(100);
  expect(prefetchRequests).toBe(0);
  releasePhoto.resolve();
  await drinkPrefetched.promise;
  expect(prefetchRequests).toBe(1);
});
