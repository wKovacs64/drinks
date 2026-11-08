import "#/test/setup.ts";
import { createTestServer } from "remix/node-fetch-server/test";
import type { TestContext } from "remix/test";
import { http } from "msw/http";
import { passthrough } from "msw/utils/passthrough";
import { router } from "#/app/router.ts";
import { resetAndSeedDatabase, TEST_ADMIN_USER } from "#/test/database.ts";
import { sessionCookie } from "#/app/modules/identity/identity.ts";
import { purgeSearchCache } from "#/app/modules/drinks/drinks.ts";
import { server as requestMocks } from "#/test/server.ts";
import { getSessionCookieValue } from "#/test/session.ts";

export async function createBrowserPage(
  testContext: TestContext,
  options: { admin?: boolean; javaScriptEnabled?: boolean; timezoneId?: string } = {},
) {
  await resetAndSeedDatabase();
  purgeSearchCache();
  const server = await createTestServer((request) => router.fetch(request));
  // Playwright's request client runs in this worker too; let it reach the real test router.
  requestMocks.use(http.all(`${server.baseUrl}/*`, () => passthrough()));
  let page = await testContext.serve(server);

  if (options.javaScriptEnabled === false || options.timezoneId) {
    const browser = page.context().browser();

    if (!browser) throw new Error("Custom page options require a browser");
    page = await browser.newPage({
      baseURL: server.baseUrl,
      javaScriptEnabled: options.javaScriptEnabled,
      timezoneId: options.timezoneId,
    });
    const customPage = page;
    // oxlint-disable-next-line typescript/no-misused-promises -- remix/test types `after` as `() => void`, but its cleanup awaits each callback.
    testContext.after(() => customPage.close());
  }

  if (options.admin === true) {
    await page.context().addCookies([
      {
        name: sessionCookie.name,
        value: await getSessionCookieValue(TEST_ADMIN_USER.id),
        url: server.baseUrl,
      },
    ]);
  }

  return page;
}
