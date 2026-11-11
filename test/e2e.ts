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
