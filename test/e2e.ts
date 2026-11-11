import type { Page } from "playwright";
import type { TestContext } from "remix/test";
import { startSeededApp } from "#/test/seeded-app.ts";

export async function createBrowserPage(
  testContext: TestContext,
  options: { admin?: boolean; javaScriptEnabled?: boolean; timezoneId?: string } = {},
) {
  const app = await startSeededApp({ admin: options.admin });
  let page = await testContext.serve(app);

  if (options.javaScriptEnabled === false || options.timezoneId) {
    const browser = page.context().browser();

    if (!browser) throw new Error("Custom page options require a browser");
    page = await browser.newPage({
      baseURL: app.baseUrl,
      javaScriptEnabled: options.javaScriptEnabled,
      timezoneId: options.timezoneId,
    });
    const customPage = page;
    // oxlint-disable-next-line typescript/no-misused-promises -- remix/test types `after` as `() => void`, but its cleanup awaits each callback.
    testContext.after(() => customPage.close());
  }

  if (app.adminSessionCookie)
    await page.context().addCookies([{ ...app.adminSessionCookie, url: app.baseUrl }]);

  return page;
}

export function captureLoggedErrorLabels(testContext: TestContext) {
  const logError = testContext.mock.method(console, "error", () => undefined);

  return () => logError.mock.calls.map((call) => String(call.arguments[0]));
}

const clockInstalledAt = Date.parse("2026-01-01T00:00:00Z");

// Pausing ahead of the install time stays valid however long the test ran before pausing.
const clockPausedAt = clockInstalledAt + 60 * 60 * 1000;

/**
 * Stops page time before navigation so only `page.clock.runFor` advances timers. Playwright's
 * installed clock otherwise follows real time, letting a slow test outlive a toast's expiry.
 */
export async function freezeClock(page: Page) {
  await page.clock.install({ time: clockInstalledAt });
  await page.clock.pauseAt(clockPausedAt);
}

/**
 * Lets time run until a POST redirects, then stops it before the browser follows the redirect.
 * Editors need running timers to submit, so tests that save and then read the toast use this.
 */
export async function freezeClockOnRedirect(page: Page) {
  await page.clock.install({ time: clockInstalledAt });
  await page.route("**/*", async (route) => {
    if (route.request().method() !== "POST") return route.fallback();

    const response = await route.fetch({ maxRedirects: 0 });

    if (response.status() >= 300 && response.status() < 400)
      await page.clock.pauseAt(clockPausedAt);

    return route.fulfill({ response });
  });
}
