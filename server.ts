import * as http from "node:http";
import { createRequestListener } from "remix/node-fetch-server";
import { migrateDatabase } from "#/scripts/migrate.ts";
import { getDb } from "#/app/db/client.ts";
import { router } from "#/app/router.ts";
import { assets } from "#/app/assets.ts";
await migrateDatabase();
const port = Number(process.env.PORT ?? 5173);
const server = http.createServer(
  createRequestListener(router.fetch, {
    // Fly terminates TLS; the HMR supervisor also supplies the public request origin.
    trustProxy: Boolean(process.env.FLY_APP_NAME) || process.env.REMIX_NODE_HMR === "1",
    onError: (error) => {
      console.error("Remix request failed", error);
      return new Response("Internal Server Error", { status: 500 });
    },
  }),
);
server.listen(port, process.env.HOST ?? "0.0.0.0", () => {
  console.log(`Remix drinks is running at http://localhost:${port}`);
  if (process.env.REMIX_NODE_HMR === "1")
    void import("remix/node-hmr/runtime").then((runtime) => runtime.emitServerReady());
});
async function shutdown() {
  server.closeAllConnections();
  server.close();
  await assets.close();
  await getDb().close();
  process.exit(0);
}
process.on("SIGTERM", () => {
  void shutdown();
});
process.on("SIGINT", () => {
  void shutdown();
});
