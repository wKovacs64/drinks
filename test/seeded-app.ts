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

export async function startSeededApp(options: { admin?: boolean } = {}) {
  await resetAndSeedDatabase();
  purgeSearchCache();

  const adminSessionCookie =
    options.admin === true
      ? { name: sessionCookie.name, value: await getSessionCookieValue(TEST_ADMIN_USER.id) }
      : undefined;

  const server = createServer(createRequestListener((request) => router.fetch(request)));
  const dropSocketsThatRejectedSubmissionsHoldOpen = () => server.closeAllConnections();
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const { port } = parse(object({ port: number() }), server.address());
  const baseUrl = `http://127.0.0.1:${port}`;
  requestMocks.use(http.all(`${baseUrl}/*`, () => passthrough()));

  return {
    baseUrl,
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error) reject(error);
          else resolve();
        });
        dropSocketsThatRejectedSubmissionsHoldOpen();
      }),
    adminSessionCookie,
  };
}
