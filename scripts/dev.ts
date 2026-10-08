import { spawn } from "node:child_process";
import * as http from "node:http";
import { run, createHmrReadyFetch } from "remix/node-hmr";
import { createFetchProxy } from "remix/fetch-proxy";
import { createRequestListener } from "remix/node-fetch-server";

const styles = spawn(
  "pnpm",
  ["exec", "tailwindcss", "-i", "app/assets/app.css", "-o", "public/app.css", "--watch"],
  { stdio: "inherit" },
);
const publicPort = Number(process.env.PORT ?? 5173);
const appPort = Number(process.env.REMIX_INTERNAL_PORT ?? publicPort + 1000);
const app = run("./server.ts", {
  env: { ...process.env, PORT: String(appPort), HOST: "127.0.0.1" },
  nodeArgs: ["--import", "remix/node-tsx", "--import", "remix/component-hmr/node"],
  watch: { ignore: ["**/node_modules/**", "public/**", "data/**"] },
});
const proxy = http.createServer(
  createRequestListener(
    createHmrReadyFetch(
      app,
      createFetchProxy(`http://127.0.0.1:${appPort}`, { xForwardedHeaders: true }),
    ),
  ),
);
proxy.listen(publicPort, process.env.HOST ?? "0.0.0.0");
let isStopping = false;
async function shutdown() {
  if (isStopping) return;
  isStopping = true;
  styles.kill("SIGTERM");
  proxy.closeAllConnections();
  proxy.close();
  await app.close();
}
process.once("SIGINT", () => void shutdown());
process.once("SIGTERM", () => void shutdown());
styles.once("error", (error) => {
  console.error("Tailwind watcher failed", error);
  void shutdown();
  process.exitCode = 1;
});
