import { test } from "remix/test";
import { expect } from "remix/assert";
import { createBrowserPage } from "#/test/e2e.ts";

test("service worker activates and remains usable after a page reload", async (testContext) => {
  const page = await createBrowserPage(testContext);
  const browserErrors: string[] = [];
  const registrationErrors: string[] = [];
  page.on("pageerror", (error) => browserErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error" && message.text().includes("Service worker registration failed"))
      registrationErrors.push(message.text());
  });
  await page.goto("/");
  await page.waitForFunction(() => navigator.serviceWorker.controller?.state === "activated");
  expect(
    await page.evaluate(async () => (await navigator.serviceWorker.ready).active?.scriptURL),
  ).toBe(new URL("/sw.js", page.url()).href);
  await page.reload();
  await page.waitForFunction(() => document.documentElement.dataset.remixReady === "true");
  expect(await page.evaluate(() => navigator.serviceWorker.controller?.state)).toBe("activated");
  await page.getByRole("link", { name: "Test Margarita", exact: true }).click();
  await page.getByText("A classic test margarita").waitFor();
  expect(browserErrors).toEqual([]);
  expect(registrationErrors).toEqual([]);
});

test("service worker registration failure is handled and search remains usable", async (testContext) => {
  const page = await createBrowserPage(testContext);
  const browserErrors: string[] = [];
  const registrationFailure = Promise.withResolvers<void>();
  page.on("pageerror", (error) => {
    browserErrors.push(error.message);
    registrationFailure.resolve();
  });
  page.on("console", (message) => {
    if (message.type() === "error" && message.text().includes("Service worker registration failed"))
      registrationFailure.resolve();
  });
  await page.addInitScript(() => {
    navigator.serviceWorker.register = () =>
      Promise.reject(new DOMException("Service worker registration blocked", "SecurityError"));
  });
  await page.goto("/search");
  await registrationFailure.promise;
  expect(browserErrors).toEqual([]);
  const input = page.getByRole("textbox", { name: "Search Term" });
  await input.fill("tequila");
  await input.press("Enter");
  await page.getByRole("heading", { name: "Test Margarita", exact: true }).waitFor();
});
