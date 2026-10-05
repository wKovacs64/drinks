import { test } from "remix/test";
import { expect } from "remix/assert";
import { createBrowserPage } from "#/test/e2e.ts";

test("navigation keeps the gallery styled without downloading its stylesheet again", async (testContext) => {
  const page = await createBrowserPage(testContext);
  await page.goto("/");
  await page.waitForFunction(() => document.documentElement.dataset.remixReady === "true");
  const headerBackground = await page.locator("header").evaluate((header) => {
    return getComputedStyle(header).backgroundColor;
  });
  let stylesheetRequests = 0;
  await page.route("**/app.css", async (route) => {
    stylesheetRequests++;
    // A stylesheet revalidation must not leave the page unstyled on a slower LAN.
    await new Promise((resolve) => setTimeout(resolve, 500));
    await route.continue();
  });
  await page.getByRole("link", { name: "Search", exact: true }).click();
  await page.waitForURL("/search");
  await page.getByRole("textbox", { name: "Search Term" }).waitFor();
  expect(
    await page.locator("header").evaluate((header) => getComputedStyle(header).backgroundColor),
  ).toBe(headerBackground);
  expect(stylesheetRequests).toBe(0);
});

test("search and deletion still work without browser JavaScript", async (testContext) => {
  const page = await createBrowserPage(testContext, { admin: true });
  await page.goto("/admin/drinks");
  const browser = page.context().browser();
  if (!browser) throw new Error("Missing test browser");
  const context = await browser.newContext({ javaScriptEnabled: false });
  try {
    await context.addCookies(await page.context().cookies());
    const noScriptPage = await context.newPage();
    const origin = new URL(page.url()).origin;
    await noScriptPage.goto(`${origin}/search?q=tequila`);
    await noScriptPage.getByRole("heading", { name: "Test Margarita", exact: true }).waitFor();
    await noScriptPage.getByRole("textbox", { name: "Search Term" }).fill("mint");
    await noScriptPage.getByRole("button", { name: "Search", exact: true }).click();
    await noScriptPage.getByRole("heading", { name: "Test Mojito", exact: true }).waitFor();
    await noScriptPage.goto(`${origin}/admin/drinks`);
    await noScriptPage
      .getByRole("row")
      .filter({ hasText: "Test Mojito" })
      .getByRole("button", { name: "Delete" })
      .click();
    await noScriptPage.getByRole("status").filter({ hasText: "Drink deleted!" }).waitFor();
    expect(new URL(noScriptPage.url()).pathname).toBe("/admin/drinks");
    expect(await noScriptPage.getByRole("cell", { name: "Test Mojito", exact: true }).count()).toBe(
      0,
    );
  } finally {
    await context.close();
  }
});

test("search document and fragment responses are separately cacheable and server rendered", async (testContext) => {
  const page = await createBrowserPage(testContext);
  const documentResponse = await page.request.get("/search?q=tequila");
  const fragmentResponse = await page.request.get("/search?q=tequila", {
    headers: { "X-Remix-Target": "search-results" },
  });
  expect(documentResponse.headers()["vary"].toLowerCase()).toContain("x-remix-target");
  expect(fragmentResponse.headers()["vary"].toLowerCase()).toContain("x-remix-target");
  expect(await documentResponse.text()).toContain("<html");
  expect(await documentResponse.text()).toContain("Test Margarita");
  expect(await fragmentResponse.text()).not.toContain("<html");
  expect(await fragmentResponse.text()).toContain("Test Margarita");
});

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

test("search refreshes its content without rendering the surrounding gallery again", async (testContext) => {
  const page = await createBrowserPage(testContext);
  await page.goto("/search?q=tequila");
  await page.waitForFunction(() => document.documentElement.dataset.remixReady === "true");
  const responsePromise = page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === "/search" &&
      new URL(response.url()).searchParams.get("q") === "mint",
  );
  const input = page.getByRole("textbox", { name: "Search Term" });
  await input.fill("mint");
  await input.press("Enter");
  const response = await responsePromise;
  expect(await response.text()).not.toContain("<html");
  expect(await response.text()).not.toContain("<header");
  await page.getByRole("heading", { name: "Test Mojito", exact: true }).waitFor();
  expect(await page.getByRole("navigation").filter({ hasText: "mint" }).count()).toBe(1);
  await page.goBack();
  await page.getByRole("heading", { name: "Test Margarita", exact: true }).waitFor();
  expect(await input.inputValue()).toBe("tequila");
  await page.goForward();
  await page.getByRole("heading", { name: "Test Mojito", exact: true }).waitFor();
  expect(await input.inputValue()).toBe("mint");
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
