import { test } from "remix/test";
import { expect } from "remix/assert";
import { createBrowserPage } from "#/test/e2e.ts";

test("navigation reuses the loaded stylesheet", async (testContext) => {
  const page = await createBrowserPage(testContext);
  await page.goto("/");
  await page.waitForFunction(() => document.documentElement.dataset.remixReady === "true");
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
  await page.waitForFunction(() => document.title === "Search Drinks");
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

test("search responds with one cacheable server-rendered document", async (testContext) => {
  const page = await createBrowserPage(testContext);
  const response = await page.request.get("/search?q=tequila");
  expect(response.headers()["vary"]?.toLowerCase()).not.toContain("x-remix-target");
  const body = await response.text();
  expect(body).toContain("<html");
  expect(body).toContain("Test Margarita");
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
  expect(await input.evaluate((element) => element === document.activeElement)).toBe(true);
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
  await page.getByText("200 cal", { exact: true }).waitFor();
  await page.goBack();
  await page.waitForURL("/tags/tequila");
  await page.getByRole("heading", { name: "Test Margarita", level: 2 }).waitFor();
});

test("search preserves results through repeated queries, empty results, and history", async (testContext) => {
  const page = await createBrowserPage(testContext);
  const margaritaPrefetched = Promise.withResolvers<void>();
  const mojitoPrefetched = Promise.withResolvers<void>();
  await page.route("**/test-margarita", async (route) => {
    margaritaPrefetched.resolve();
    await route.continue();
  });
  await page.route("**/test-mojito", async (route) => {
    mojitoPrefetched.resolve();
    await route.continue();
  });
  await page.goto("/search?q=tequila");
  await page.waitForFunction(() => document.documentElement.dataset.remixReady === "true");
  await page.getByRole("heading", { name: "Test Margarita", exact: true }).waitFor();
  await margaritaPrefetched.promise;
  const input = page.getByRole("textbox", { name: "Search Term" });
  await input.fill("mint");
  await input.press("Enter");
  await page.getByRole("heading", { name: "Test Mojito", exact: true }).waitFor();
  await mojitoPrefetched.promise;
  expect(await page.getByRole("navigation").filter({ hasText: "mint" }).count()).toBe(1);
  expect(await page.getByRole("heading", { name: "Test Margarita", exact: true }).count()).toBe(0);
  await input.fill("no-matching-drink");
  await input.press("Enter");
  await page.getByText("No matching drinks found.", { exact: true }).waitFor();
  expect(await page.getByRole("article").count()).toBe(0);
  await page.goBack();
  await page.getByRole("heading", { name: "Test Mojito", exact: true }).waitFor();
  expect(await input.inputValue()).toBe("mint");
  await page.goBack();
  await page.getByRole("heading", { name: "Test Margarita", exact: true }).waitFor();
  expect(await input.inputValue()).toBe("tequila");
  await page.goForward();
  await page.getByRole("heading", { name: "Test Mojito", exact: true }).waitFor();
  expect(await input.inputValue()).toBe("mint");
});

test("search results stay visible while a result loads", async (testContext) => {
  const page = await createBrowserPage(testContext);
  const resultReleased = Promise.withResolvers<void>();
  await page.route("**/test-margarita", async (route) => {
    await resultReleased.promise;
    await route.continue();
  });
  await page.goto("/search?q=tequila");
  await page.waitForFunction(() => document.documentElement.dataset.remixReady === "true");
  const result = page.getByRole("link", { name: "Test Margarita", exact: true });
  await result.click();
  await page.waitForURL("/test-margarita");
  expect(await result.isVisible()).toBe(true);
  resultReleased.resolve();
  await page.getByText("2 oz tequila", { exact: true }).waitFor();
  await page.waitForFunction(() => document.title === "Test Margarita");
});

test("visible Drink links prefetch and retain navigation", async (testContext) => {
  const page = await createBrowserPage(testContext);
  await page.setViewportSize({ width: 390, height: 340 });
  const requestedPaths = new Set<string>();
  page.on("request", (request) => {
    requestedPaths.add(new URL(request.url()).pathname);
  });
  const firstPrefetched = page.waitForRequest(
    (request) => new URL(request.url()).pathname === "/test-margarita",
  );
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => document.documentElement.dataset.remixReady === "true");
  await firstPrefetched;
  expect(requestedPaths.has("/test-mojito")).toBe(false);
  expect(requestedPaths.has("/test-old-fashioned")).toBe(false);

  const nextPrefetched = page.waitForRequest(
    (request) => new URL(request.url()).pathname === "/test-mojito",
  );
  await page.getByRole("link", { name: "Test Mojito", exact: true }).scrollIntoViewIfNeeded();
  await nextPrefetched;
  expect(requestedPaths.has("/test-old-fashioned")).toBe(false);

  const lastPrefetched = page.waitForRequest(
    (request) => new URL(request.url()).pathname === "/test-old-fashioned",
  );
  const lastCard = page.getByRole("link", { name: "Test Old Fashioned", exact: true });
  await lastCard.scrollIntoViewIfNeeded();
  await lastPrefetched;
  await lastCard.click();
  await page.waitForURL("/test-old-fashioned");
  await page.getByText("2 oz bourbon", { exact: true }).waitFor();
});
