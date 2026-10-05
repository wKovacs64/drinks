import { test, type TestContext } from "remix/test";
import { expect } from "remix/assert";
import { createBrowserPage } from "#/test/e2e.ts";

async function showDeletionNotification(testContext: TestContext) {
  const page = await createBrowserPage(testContext, { admin: true });
  await page.clock.install();
  await page.request.post("/admin/drinks/test-mojito/delete", { maxRedirects: 0 });
  await page.goto("/admin/drinks");
  await page.waitForFunction(() => document.documentElement.dataset.remixReady === "true");
  await page.getByRole("status").filter({ hasText: "Drink deleted!" }).waitFor();
  return page;
}

test("a notification pauses while hovered and expires after leaving", async (testContext) => {
  const page = await showDeletionNotification(testContext);
  const notification = page.getByRole("status");
  await page.clock.runFor(1000);
  await notification.hover();
  await page.clock.runFor(5000);
  expect(await notification.count()).toBe(1);
  await page.mouse.move(0, 0);
  await page.clock.runFor(4000);
  await notification.waitFor({ state: "hidden" });
  expect(await notification.count()).toBe(0);
});

test("Alt+T focuses a notification and Escape dismisses it", async (testContext) => {
  const page = await showDeletionNotification(testContext);
  const notification = page.getByRole("status");
  await page.keyboard.press("Alt+t");
  expect(await notification.evaluate((element) => document.activeElement === element)).toBe(true);
  await page.clock.runFor(5000);
  expect(await notification.count()).toBe(1);
  await page.keyboard.press("Escape");
  await notification.waitFor({ state: "hidden" });
  expect(await notification.count()).toBe(0);
});

test("a notification can be dismissed with a swipe", async (testContext) => {
  const page = await showDeletionNotification(testContext);
  const notification = page.getByRole("status");
  const bounds = await notification.boundingBox();
  if (!bounds) throw new Error("Notification has no bounds");
  await page.mouse.move(bounds.x + 20, bounds.y + 20);
  await page.mouse.down();
  await page.mouse.move(bounds.x + 70, bounds.y + 20);
  await page.mouse.up();
  await notification.waitFor({ state: "hidden" });
  expect(await notification.count()).toBe(0);
});
