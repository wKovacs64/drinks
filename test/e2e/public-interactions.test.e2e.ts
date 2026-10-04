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
