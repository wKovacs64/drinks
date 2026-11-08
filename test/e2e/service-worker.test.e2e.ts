import { test } from "remix/test";
import { expect } from "remix/assert";
import { createBrowserPage } from "#/test/e2e.ts";

test("pages register no service worker", async (testContext) => {
  const page = await createBrowserPage(testContext);
  await page.goto("/");
  await page.waitForFunction(() => document.documentElement.dataset.remixReady === "true");
  expect(
    await page.evaluate(async () => (await navigator.serviceWorker.getRegistrations()).length),
  ).toBe(0);
});

test("retired service worker clears caches and unregisters itself", async (testContext) => {
  const page = await createBrowserPage(testContext);
  const response = await page.request.get("/sw.js");
  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toMatch(/^text\/javascript\b/);
  await page.goto("/");

  const remaining = await page.evaluate(async () => {
    await (await caches.open("document-cache-v4")).put("/", new Response("stale"));
    const registration = await navigator.serviceWorker.register("/sw.js");
    const worker = registration.installing;

    if (!worker) throw new Error("Expected an installing service worker");
    // Activation waits for the worker's activate handler; unregistering can end it as redundant.
    await new Promise<void>((resolve) =>
      worker.addEventListener("statechange", () => {
        if (worker.state === "activated" || worker.state === "redundant") resolve();
      }),
    );

    return {
      registrations: (await navigator.serviceWorker.getRegistrations()).length,
      caches: await caches.keys(),
    };
  });

  expect(remaining).toEqual({ registrations: 0, caches: [] });
});
