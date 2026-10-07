import "#/test/setup.ts";
import { createTestServer } from "remix/node-fetch-server/test";
import type { TestContext } from "remix/test";
import { http, passthrough } from "msw";
import { router } from "#/app/router.ts";
import { resetAndSeedDatabase, TEST_ADMIN_USER } from "#/test/database.ts";
import { getRawSessionCookieValue, sessionCookie } from "#/app/modules/identity/identity.ts";
import { purgeSearchCache } from "#/app/modules/drinks/drinks.ts";
import { server as requestMocks } from "#/test/server.ts";

export async function createBrowserPage(
  testContext: TestContext,
  options: { admin?: boolean; javaScriptEnabled?: boolean } = {},
) {
  await resetAndSeedDatabase();
  purgeSearchCache();
  const server = await createTestServer(router.fetch);
  // Playwright's request client runs in this worker too; let it reach the real test router.
  requestMocks.use(http.all(`${server.baseUrl}/*`, () => passthrough()));
  let page = await testContext.serve(server);
  if (options.javaScriptEnabled === false) {
    const browser = page.context().browser();
    if (!browser) throw new Error("Native form tests require a browser");
    page = await browser.newPage({ baseURL: server.baseUrl, javaScriptEnabled: false });
    const nativePage = page;
    testContext.after(() => nativePage.close());
  }
  if (options.admin) {
    await page.context().addCookies([
      {
        name: sessionCookie.name,
        value: await getRawSessionCookieValue({
          ...TEST_ADMIN_USER,
          name: TEST_ADMIN_USER.name ?? null,
          avatarUrl: TEST_ADMIN_USER.avatarUrl ?? null,
          role: "admin",
        }),
        url: server.baseUrl,
      },
    ]);
  }
  return page;
}
