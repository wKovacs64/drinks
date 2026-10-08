import { spawn, execFile } from "node:child_process";
import { createHash, randomUUID, X509Certificate } from "node:crypto";
import { createWriteStream } from "node:fs";
import { readFile } from "node:fs/promises";
import * as http from "node:http";
import * as http2 from "node:http2";
import { join } from "node:path";
import { backup, DatabaseSync } from "node:sqlite";
import { promisify } from "node:util";
import { brotliCompress, constants } from "node:zlib";

const runFile = promisify(execFile);
const compress = promisify(brotliCompress);
const hopHeaders = new Set([
  "connection",
  "keep-alive",
  "proxy-connection",
  "transfer-encoding",
  "upgrade",
  "te",
]);

export async function availablePort() {
  const server = http.createServer();
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("No loopback port available");
  await new Promise<void>((resolve) => server.close(() => resolve()));
  return address.port;
}

function proxyHeaders(headers: http.IncomingHttpHeaders) {
  return Object.fromEntries(
    Object.entries(headers).filter(([key]) => !key.startsWith(":") && !hopHeaders.has(key)),
  );
}

export async function startPerformanceServer(
  sourceDatabase: string,
  paths: string[],
  temporaryDirectory: string,
  outputDirectory: string,
  signal: AbortSignal,
) {
  // SQLite's backup API includes committed WAL data without modifying the source.
  const databasePath = join(temporaryDirectory, "catalog.db");
  const source = new DatabaseSync(sourceDatabase, { readOnly: true });
  try {
    await backup(source, databasePath);
  } finally {
    source.close();
  }
  const snapshot = new DatabaseSync(databasePath, { readOnly: true });
  let catalog;
  try {
    const published = snapshot
      .prepare("SELECT * FROM drinks WHERE status = 'published' ORDER BY id")
      .all();
    if (!published.length) throw new Error("The benchmark catalog has no Published drinks");
    catalog = {
      publishedDrinks: published.length,
      // Compare catalog content, not SQLite's incidental file layout or User data.
      sha256: createHash("sha256").update(JSON.stringify(published)).digest("hex"),
    };
  } finally {
    snapshot.close();
  }

  const keyPath = join(temporaryDirectory, "key.pem");
  const certPath = join(temporaryDirectory, "cert.pem");
  await runFile("openssl", [
    "req",
    "-x509",
    "-newkey",
    "rsa:2048",
    "-nodes",
    "-days",
    "1",
    "-keyout",
    keyPath,
    "-out",
    certPath,
    "-subj",
    "/CN=localhost",
    "-addext",
    "subjectAltName=DNS:localhost,IP:127.0.0.1",
  ]);
  const key = await readFile(keyPath);
  const cert = await readFile(certPath);
  const spki = createHash("sha256")
    .update(new X509Certificate(cert).publicKey.export({ type: "spki", format: "der" }))
    .digest("base64");

  const originPort = await availablePort();
  const origin = `http://127.0.0.1:${originPort}`;
  const log = createWriteStream(join(outputDirectory, "server.log"));
  const child = spawn(process.execPath, ["--import", "remix/node-tsx", "server.ts"], {
    env: {
      ...process.env,
      NODE_ENV: "production",
      DEPLOYMENT_ENV: "performance",
      COMMIT_SHA: "local",
      DATABASE_URL: databasePath,
      PORT: String(originPort),
      HOST: "127.0.0.1",
      REMIX_NODE_HMR: "0",
      FLY_APP_NAME: "",
      SESSION_SECRET: randomUUID(),
      GOOGLE_CLIENT_ID: "performance-local-only",
      GOOGLE_CLIENT_SECRET: "performance-local-only",
      GOOGLE_REDIRECT_URI: `${origin}/auth/google/callback`,
      IMAGEKIT_PUBLIC_KEY: "performance-local-only",
      IMAGEKIT_PRIVATE_KEY: "performance-local-only",
      IMAGEKIT_URL_ENDPOINT: "https://ik.imagekit.io/",
      FASTLY_SERVICE_ID: "",
      FASTLY_PURGE_API_KEY: "",
      SITE_IMAGE_URL: "/images/icon-512x512.png",
      SITE_IMAGE_ALT: "Local performance gallery",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  child.stdout.pipe(log, { end: false });
  child.stderr.pipe(log, { end: false });
  let childError: Error | undefined;
  child.on("error", (error) => {
    childError = error;
  });
  const childClosed = new Promise<void>((resolve) => child.once("close", () => resolve()));
  const sessions = new Set<http2.ServerHttp2Session>();
  const cache = new Map<
    string,
    { status: number; headers: http.OutgoingHttpHeaders; body: Buffer }
  >();
  const proxy = http2.createSecureServer({ key, cert, allowHTTP1: true });
  proxy.on("session", (session) => {
    sessions.add(session);
    session.once("close", () => sessions.delete(session));
  });
  proxy.on("request", (request, response) => {
    if (request.method !== "GET" && request.method !== "HEAD") {
      response.writeHead(405).end("Performance server supports read-only navigation");
      return;
    }
    const encoding = /\bbr\b/.test(request.headers["accept-encoding"] ?? "") ? "br" : "identity";
    const cacheKey = `${request.url}:${encoding}`;
    const hit = !request.headers.cookie && cache.get(cacheKey);
    if (hit) {
      response.writeHead(hit.status, hit.headers);
      if (request.method === "HEAD") response.end();
      else response.end(hit.body);
      return;
    }
    const upstream = http.request(
      new URL(request.url ?? "/", origin),
      {
        method: request.method,
        headers: { ...proxyHeaders(request.headers), host: `127.0.0.1:${originPort}` },
      },
      (result) => {
        const chunks: Buffer[] = [];
        result.on("data", (chunk: Buffer) => chunks.push(chunk));
        result.on("error", () => response.destroy());
        result.on("end", () => {
          void (async () => {
            let body = Buffer.concat(chunks);
            const headers: http.OutgoingHttpHeaders = proxyHeaders(result.headers);
            if (
              encoding === "br" &&
              request.method === "GET" &&
              !headers["content-encoding"] &&
              /^(text\/|application\/(javascript|json)|image\/svg\+xml)/.test(
                String(headers["content-type"]),
              )
            ) {
              body = await compress(body, { params: { [constants.BROTLI_PARAM_QUALITY]: 4 } });
              headers["content-encoding"] = "br";
              headers.vary = [headers.vary, "Accept-Encoding"].filter(Boolean).join(", ");
              headers["content-length"] = body.length;
            }
            const status = result.statusCode ?? 502;
            // Only immutable public assets are cached; documents still exercise the server.
            if (
              request.method === "GET" &&
              status === 200 &&
              !request.headers.cookie &&
              !headers["set-cookie"] &&
              /\bimmutable\b/.test(String(headers["cache-control"])) &&
              !/private|no-store/.test(String(headers["cache-control"]))
            ) {
              cache.set(cacheKey, { status, headers, body });
            }
            if (!response.destroyed) {
              response.writeHead(status, headers);
              response.end(body);
            }
          })().catch(() => response.destroy());
        });
      },
    );
    upstream.on("error", () => {
      if (!response.destroyed) response.writeHead(502).end("Performance origin unavailable");
    });
    upstream.setTimeout(30_000, () => upstream.destroy());
    upstream.end();
  });

  async function close() {
    for (const session of sessions) session.destroy();
    if (proxy.listening) await new Promise<void>((resolve) => proxy.close(() => resolve()));
    child.kill("SIGTERM");
    const timeout = setTimeout(() => child.kill("SIGKILL"), 5000);
    await childClosed;
    clearTimeout(timeout);
    log.end();
  }
  try {
    let ready = false;
    for (let attempt = 0; attempt < 300; attempt++) {
      signal.throwIfAborted();
      if (childError) throw childError;
      if (child.exitCode !== null) throw new Error("Production server exited; see server.log");
      try {
        const response = await fetch(`${origin}/_/healthcheck`, {
          signal: AbortSignal.any([signal, AbortSignal.timeout(1000)]),
        });
        if (response.ok) {
          ready = true;
          break;
        }
      } catch {
        /* Wait for the child to begin listening. */
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    if (!ready) throw new Error("Production server did not become ready; see server.log");
    // Compile and serve the requested graphs before timing cold-browser navigations.
    const warmUrls = new Set(paths);
    for (const path of paths) {
      const response = await fetch(new URL(path, origin), { signal });
      if (!response.ok) throw new Error(`Warmup failed for ${path}: HTTP ${response.status}`);
      const html = await response.text();
      const urls = new Set(
        [...html.matchAll(/(?:src|href)="(\/assets\/[^"<>]+)"/g)].map((match) => match[1]),
      );
      for (const url of urls) {
        warmUrls.add(url);
        const asset = await fetch(new URL(url, origin), { signal });
        if (!asset.ok) throw new Error(`Asset warmup failed: HTTP ${asset.status}`);
        await asset.arrayBuffer();
      }
    }
    await new Promise<void>((resolve, reject) => {
      proxy.once("error", reject);
      proxy.listen(0, "127.0.0.1", resolve);
    });
    const address = proxy.address();
    if (!address || typeof address === "string") throw new Error("No performance proxy port");
    const url = `https://127.0.0.1:${address.port}`;
    // Warm compression and the immutable asset cache too, so sample 1 has the
    // same proxy state as later samples. This does not populate browser caches.
    const client = http2.connect(url, { ca: cert });
    client.on("error", () => {
      /* Individual requests report session failures. */
    });
    try {
      for (const path of warmUrls) {
        signal.throwIfAborted();
        await new Promise<void>((resolve, reject) => {
          const request = client.request({ ":path": path, "accept-encoding": "br" });
          request.once("response", (headers) => {
            if (headers[":status"] !== 200)
              reject(new Error(`Proxy warmup failed: ${headers[":status"]}`));
          });
          request.on("error", reject);
          request.on("end", resolve);
          request.resume();
          request.end();
        });
      }
    } finally {
      client.close();
    }
    return { url, spki, catalog, close };
  } catch (error) {
    await close();
    throw error;
  }
}
