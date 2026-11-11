import "#/test/setup.ts";
import { once } from "node:events";
import { createServer } from "node:http";
import { createRequestListener } from "remix/node-fetch-server";
import { number, object, parse } from "remix/data-schema";
import { http } from "msw/http";
import { passthrough } from "msw/utils/passthrough";
import { router } from "#/app/router.ts";
import { purgeSearchCache } from "#/app/modules/drinks/drinks.ts";
import { sessionCookie } from "#/app/modules/identity/identity.ts";
import { resetAndSeedDatabase, TEST_ADMIN_USER } from "#/test/database.ts";
import { server as requestMocks } from "#/test/server.ts";
import { getSessionCookieValue } from "#/test/session.ts";

/**
 * Seeds the database and serves the real router over HTTP, optionally with an Admin session cookie
 * for the client to carry. The result is a test server: pass it to `testContext.serve` for a browser
 * page, or request `baseUrl` directly and register `close` with `testContext.after`.
 */
export async function startSeededApp(options: { admin?: boolean } = {}) {
  await resetAndSeedDatabase();
  // The search cache outlives a database reset.
  purgeSearchCache();

  const adminSessionCookie =
    options.admin === true
      ? { name: sessionCookie.name, value: await getSessionCookieValue(TEST_ADMIN_USER.id) }
      : undefined;

  const server = createServer(createRequestListener((request) => router.fetch(request)));
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const { port } = parse(object({ port: number() }), server.address());
  const baseUrl = `http://127.0.0.1:${port}`;
  // MSW intercepts this worker's requests, including Playwright's request client; let them reach the real router.
  requestMocks.use(http.all(`${baseUrl}/*`, () => passthrough()));

  return {
    baseUrl,
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error) reject(error);
          else resolve();
        });
        // A submission rejected mid-body keeps its socket open for seconds, and `server.close` alone
        // waits for it. Remix's `createTestServer` exposes no way to drop it.
        server.closeAllConnections();
      }),
    adminSessionCookie,
  };
}
