import { test } from "remix/test";
import { expect } from "remix/assert";
import { rawSql } from "remix/data-table";
import { getDb } from "#/app/db/client.ts";
import { createBrowserPage } from "#/test/e2e.ts";

test("an unmatched path keeps the gallery navigation around its not-found message", async (testContext) => {
  const page = await createBrowserPage(testContext);
  const response = await page.goto("/unknown/deep/path");
  expect(response?.status()).toBe(404);
  expect(await page.locator("header").count()).toBe(1);
  expect(await page.locator("footer").count()).toBe(1);
  await page.getByRole("navigation").filter({ hasText: "All Drinks" }).waitFor();
  await page.getByRole("link", { name: "Back to Drinks" }).click();
  await page.getByRole("heading", { name: "Test Margarita", exact: true }).waitFor();
});

test("a missing admin drink displays a not-found response and a working recovery link", async (testContext) => {
  const page = await createBrowserPage(testContext, { admin: true });
  const response = await page.goto("/admin/drinks/missing/edit");
  expect(response?.status()).toBe(404);
  await page.getByRole("heading", { name: "404 Not Found", exact: true }).waitFor();
  expect(await page.locator("header").count()).toBe(0);
  await page.getByRole("link", { name: "Back to Drinks" }).click();
  await page.getByRole("cell", { name: "Test Margarita", exact: true }).waitFor();
});

test("a public route failure displays the exception page and a working recovery link", async (testContext) => {
  const page = await createBrowserPage(testContext);
  await getDb().exec(
    rawSql("UPDATE drinks SET ingredients = 'invalid-json' WHERE slug = 'test-margarita'"),
  );
  const response = await page.goto("/test-margarita");
  expect(response?.status()).toBe(500);
  await page.getByRole("heading", { name: "Unhandled Exception" }).waitFor();
  await page.getByText("The error message was as follows:").waitFor();
  await getDb().exec(rawSql("DELETE FROM drinks WHERE slug = 'test-margarita'"));
  await page.getByRole("link", { name: "Try Starting Over" }).click();
  await page.getByRole("heading", { name: "Test Mojito", exact: true }).waitFor();
});

test("an admin route failure displays the asset-independent server error document", async (testContext) => {
  const page = await createBrowserPage(testContext, { admin: true });
  await getDb().exec(
    rawSql("UPDATE drinks SET created_at = 9999999999999999 WHERE slug = 'test-margarita'"),
  );
  for (const path of ["/admin/drinks", "/%61dmin/%64rinks"]) {
    const response = await page.goto(path);
    expect(response?.status()).toBe(500);
    expect(response?.headers()["cache-control"]).toBe("private, no-store");
    await page.getByRole("heading", { name: "Server error", exact: true }).waitFor();
    expect(await page.locator("header").count()).toBe(0);
  }
});

test("a failed search update replaces the gallery with the original exception document", async (testContext) => {
  const page = await createBrowserPage(testContext);
  await page.goto("/search");
  await page.waitForFunction(() => document.documentElement.dataset.remixReady === "true");
  await getDb().exec(
    rawSql("UPDATE drinks SET ingredients = 'invalid-json' WHERE slug = 'test-margarita'"),
  );
  const input = page.getByRole("textbox", { name: "Search Term" });
  await input.fill("tequila");
  await input.press("Enter");
  await page.getByRole("heading", { name: "Unhandled Exception" }).waitFor();
  await page.waitForFunction(() => document.querySelector("header") === null, undefined, {
    timeout: 2000,
  });
  expect(await page.getByRole("link", { name: "Try Starting Over" }).count()).toBe(1);
});

test("a failed drink navigation displays its exception document instead of retaining the gallery", async (testContext) => {
  const page = await createBrowserPage(testContext);
  // Disable the document cache so a viewport-prefetched success cannot hide the later failure.
  await page.route("**/test-margarita", (route) => route.continue());
  await page.goto("/");
  await page.waitForFunction(() => document.documentElement.dataset.remixReady === "true");
  await getDb().exec(
    rawSql("UPDATE drinks SET ingredients = 'invalid-json' WHERE slug = 'test-margarita'"),
  );
  await page.getByRole("link", { name: "Test Margarita", exact: true }).click();
  await page.getByRole("heading", { name: "Unhandled Exception" }).waitFor();
  expect(new URL(page.url()).pathname).toBe("/test-margarita");
  expect(await page.locator("header").count()).toBe(0);
});
