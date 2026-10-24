import { test } from "remix/test";
import { expect } from "remix/assert";
import { createBrowserPage } from "#/test/e2e.ts";

test("Search controls hydrate after gallery navigation", async (context) => {
  const page = await createBrowserPage(context);
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
