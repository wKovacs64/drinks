// Run explicitly through remix test; this measurement harness is outside normal test discovery.
import { writeFileSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { beforeAll, afterAll, afterEach, test } from "remix/test";
import { expect } from "remix/assert";
import { createTestServer } from "remix/node-fetch-server/test";
import { http, passthrough } from "msw";
import { router } from "#/app/router.ts";
import { getDb } from "#/app/db/client.server.ts";
import { drinks, writeDrink } from "#/app/db/schema.ts";
import { rawSql } from "remix/data-table";
import { purgeSearchCache } from "#/app/modules/drinks/drinks.server.ts";
import { TEST_DRINKS } from "#/test/database.ts";
import { server as requestMocks } from "#/test/server.ts";
import { migrateDatabase } from "#/scripts/migrate.ts";

type Sample = { paintMs: number; htmlBytes: number; gzipBytes: number; responseMs: number };
type Result = {
  profile: string;
  searchInitial: Sample[];
  searchUpdate: Sample[];
};
const results: Result[] = [];
const outputPath = process.env.FRAME_MEASUREMENT_OUTPUT;
if (!outputPath) throw new Error("Set FRAME_MEASUREMENT_OUTPUT to the result JSON path");
if (process.env.NODE_ENV !== "production")
  throw new Error("Measurements require NODE_ENV=production");
if (process.env.DATABASE_URL !== ":memory:")
  throw new Error("Measurements require DATABASE_URL=:memory:");
await migrateDatabase();
beforeAll(() => requestMocks.listen({ onUnhandledRequest: "error" }));
afterEach(() => requestMocks.resetHandlers());
afterAll(() => requestMocks.close());

for (const profile of ["local", "constrained"]) {
  test(`measure Frames (${profile})`, async (testContext) => {
    const database = getDb();
    await database.exec(rawSql("DELETE FROM drinks"));
    const fixtureDrinks = Array.from({ length: 40 }, (_, index) => {
      const original = TEST_DRINKS[index % TEST_DRINKS.length];
      return {
        ...original,
        id: `measurement-${index}`,
        slug: `${original.slug}-${index}`,
        title: `${original.title} ${index}`,
        createdAt: new Date("2026-01-01T00:00:00Z"),
        updatedAt: new Date("2026-01-01T00:00:00Z"),
      };
    });
    await database.createMany(drinks, fixtureDrinks.map(writeDrink));
    purgeSearchCache();
    // Model the gzip serving layer that production leaves to Fastly/Fly. Buffering also lets
    // us record exact sizes without relying on Chromium retaining streamed response bodies.
    const server = await createTestServer(async (request) => {
      const response = await router.fetch(request);
      const contentType = response.headers.get("Content-Type") ?? "";
      if (!response.body || !/text\/|javascript|json|svg/.test(contentType)) return response;
      const body = new Uint8Array(await response.arrayBuffer());
      const compressedBody = gzipSync(body);
      const headers = new Headers(response.headers);
      headers.set("Content-Encoding", "gzip");
      headers.set("Content-Length", String(compressedBody.length));
      headers.set("X-Measurement-Html-Bytes", String(body.length));
      headers.set("X-Measurement-Gzip-Bytes", String(compressedBody.length));
      return new Response(compressedBody, { status: response.status, headers });
    });
    requestMocks.use(http.all(`${server.baseUrl}/*`, () => passthrough()));
    const page = await testContext.serve(server);
    const browserErrors: string[] = [];
    page.on("pageerror", (error) => browserErrors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error" && message.text().includes("Remix browser runtime failed"))
        browserErrors.push(message.text());
    });
    const session = await page.context().newCDPSession(page);
    await session.send("Network.enable");
    await session.send("Network.setCacheDisabled", { cacheDisabled: true });
    await session.send("Network.setBypassServiceWorker", { bypass: true });
    if (profile === "constrained") {
      await session.send("Emulation.setCPUThrottlingRate", { rate: 4 });
      await session.send("Network.emulateNetworkConditions", {
        offline: false,
        latency: 60,
        downloadThroughput: 200_000,
        uploadThroughput: 93_750,
      });
    }
    const result: Result = {
      profile,
      searchInitial: [],
      searchUpdate: [],
    };

    async function load(path: string): Promise<Sample> {
      const response = await page.goto(path, { waitUntil: "domcontentloaded" });
      if (!response) throw new Error("Missing document response");
      await page.waitForFunction(() => document.documentElement.dataset.remixReady === "true");
      const paintMs = await page.evaluate(
        () =>
          new Promise<number>((resolve) => {
            requestAnimationFrame(() => requestAnimationFrame(() => resolve(performance.now())));
          }),
      );
      const navigation = await page.evaluate(() => {
        const timing = performance.getEntriesByType("navigation")[0];
        return timing instanceof PerformanceNavigationTiming
          ? timing.responseEnd - timing.requestStart
          : 0;
      });
      return {
        paintMs,
        htmlBytes: Number(response.headers()["x-measurement-html-bytes"]),
        gzipBytes: Number(response.headers()["x-measurement-gzip-bytes"]),
        responseMs: navigation,
      };
    }

    // Warm the page graph and search index before retaining samples.
    await load("/search?q=tequila");
    for (let index = 0; index < 5; index++) {
      result.searchInitial.push(await load("/search?q=tequila"));
    }
    await load("/search?q=tequila");
    for (let index = 0; index < 12; index++) {
      const query = index % 2 === 0 ? "mint" : "tequila";
      const expectedTitle = query === "mint" ? "Test Mojito" : "Test Margarita";
      const responsePromise = page.waitForResponse(
        (response) =>
          new URL(response.url()).pathname === "/search" &&
          new URL(response.url()).searchParams.get("q") === query,
      );
      await page.getByRole("textbox", { name: "Search Term" }).fill(query);
      await page.evaluate((title) => {
        Reflect.set(window, "measurementStart", performance.now());
        Reflect.set(window, "measurementPaint", undefined);
        const observer = new MutationObserver(() => {
          if (!document.querySelector("article h2")?.textContent?.startsWith(title)) return;
          observer.disconnect();
          requestAnimationFrame(() =>
            requestAnimationFrame(() =>
              Reflect.set(
                window,
                "measurementPaint",
                performance.now() - Number(Reflect.get(window, "measurementStart")),
              ),
            ),
          );
        });
        observer.observe(document.body, { childList: true, subtree: true });
        document.querySelector("form")?.requestSubmit();
      }, expectedTitle);
      const response = await responsePromise;
      await page.waitForFunction(() => typeof Reflect.get(window, "measurementPaint") === "number");
      const timing = response.request().timing();
      result.searchUpdate.push({
        paintMs: await page.evaluate(() => Number(Reflect.get(window, "measurementPaint"))),
        htmlBytes: Number(response.headers()["x-measurement-html-bytes"]),
        gzipBytes: Number(response.headers()["x-measurement-gzip-bytes"]),
        responseMs: timing.responseEnd - timing.requestStart,
      });
    }

    expect(browserErrors).toEqual([]);
    expect(await page.locator("article").count()).toBe(14);
    results.push(result);
    writeFileSync(
      outputPath,
      JSON.stringify({ fixtureCount: 40, environment: "production", results }, null, 2) + "\n",
    );
  });
}
