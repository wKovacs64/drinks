import type { Page } from "playwright";
import { expect } from "remix/assert";
import type { TestContext } from "remix/test";
import { startSeededApp } from "#/test/seeded-app.ts";
import { afterAwaitingCleanup } from "#/test/cleanup.ts";

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
    afterAwaitingCleanup(testContext, () => customPage.close());
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

const clockPausedAheadOfAnyTestDuration = clockInstalledAt + 60 * 60 * 1000;

export async function freezeClock(page: Page) {
  await page.clock.install({ time: clockInstalledAt });
  await page.clock.pauseAt(clockPausedAheadOfAnyTestDuration);
}

export async function freezeClockOnRedirect(page: Page) {
  await page.clock.install({ time: clockInstalledAt });
  await page.route("**/*", async (route) => {
    if (route.request().method() !== "POST") return route.fallback();

    const response = await route.fetch({ maxRedirects: 0 });

    if (response.status() >= 300 && response.status() < 400)
      await page.clock.pauseAt(clockPausedAheadOfAnyTestDuration);

    return route.fulfill({ response });
  });
}

export async function stubGoogleSignInByInterceptingTheLoginRedirect(page: Page) {
  const oauthDestination = Promise.withResolvers<string>();

  await page.route("**/login", async (route) => {
    const response = await route.fetch({ maxRedirects: 0 });
    expect(response.status()).toBe(302);
    oauthDestination.resolve(response.headers().location);
    await route.fulfill({ status: 200, contentType: "text/html", body: "<h1>Google sign in</h1>" });
  });

  return oauthDestination;
}
