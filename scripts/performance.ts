import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { hostname, tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { parseArgs, promisify } from "node:util";
import lighthouse, { desktopConfig, generateReport, type Flags } from "lighthouse";
import { saveTrace, saveDevtoolsLog } from "lighthouse/core/lib/asset-saver.js";
import { throttling as presets } from "lighthouse/core/config/constants.js";
import { chromium, type Browser } from "playwright";
import { availablePort, startPerformanceServer } from "./performance/server.ts";
import {
  printSummary,
  readSummary,
  renderSummary,
  sampleFromReport,
  type Summary,
} from "./performance/results.ts";

const runFile = promisify(execFile);
const { values } = parseArgs({
  options: {
    help: { type: "boolean", short: "h" },
    database: { type: "string" },
    label: { type: "string", default: "local" },
    profile: { type: "string", default: "both" },
    runs: { type: "string", default: "3" },
    path: { type: "string", multiple: true },
    throttling: { type: "string", default: "simulate" },
    cpu: { type: "string" },
    compare: { type: "string" },
    output: { type: "string" },
  },
});

if (values.help) {
  console.log(`Usage: pnpm perf [options]

  --database PATH        Source SQLite catalog (default: DATABASE_URL or data/drinks.db)
  --label NAME           Label for saved results (default: local)
  --profile both|mobile|desktop  Lighthouse profiles (default: both)
  --runs N               Samples per profile/page (default: 3)
  --path PATH            Page to measure, repeatable (default: /)
  --throttling simulate|devtools (default: simulate, like PageSpeed)
  --cpu N                Override the profile's CPU slowdown multiplier
  --compare FILE         Previous summary.json to compare against
  --output DIRECTORY     New output directory (default: performance-results/NAME-TIMESTAMP)

Install Chrome once: pnpm exec playwright install chromium
Requires OpenSSL. Uses production assets, a copied catalog, HTTPS/HTTP2, and Brotli.
Image CDN requests remain live. Results and traces stay on this machine.`);
  process.exit(0);
}

async function main() {
  const runs = Number(values.runs);
  if (!Number.isInteger(runs) || runs < 1 || runs > 20)
    throw new Error("--runs must be an integer from 1 to 20");
  if (!/^[a-zA-Z0-9_-]{1,60}$/.test(values.label))
    throw new Error("--label must contain 1–60 letters, digits, hyphens, or underscores");
  const profiles = values.profile === "both" ? ["mobile", "desktop"] : [values.profile];
  if (profiles.some((profile) => profile !== "mobile" && profile !== "desktop"))
    throw new Error("--profile must be both, mobile, or desktop");
  const throttling = values.throttling;
  if (throttling !== "simulate" && throttling !== "devtools")
    throw new Error("--throttling must be simulate or devtools");
  const cpu = values.cpu === undefined ? undefined : Number(values.cpu);
  if (cpu !== undefined && (!Number.isFinite(cpu) || cpu < 1))
    throw new Error("--cpu must be a finite number of at least 1");
  const paths = [...new Set(values.path ?? ["/"])];
  for (const path of paths) {
    if (
      !path.startsWith("/") ||
      new URL(path, "https://localhost").origin !== "https://localhost"
    ) {
      throw new Error("--path must be a local path, such as / or /search?q=tequila");
    }
  }
  const sourceDatabase = resolve(values.database ?? process.env.DATABASE_URL ?? "data/drinks.db");
  if (!existsSync(sourceDatabase))
    throw new Error(
      "Local catalog not found. Set DATABASE_URL in .env or pass --database /path/to/drinks.db",
    );
  if (!existsSync(chromium.executablePath()))
    throw new Error("Install the performance browser with: pnpm exec playwright install chromium");
  const baseline = values.compare ? await readSummary(values.compare) : undefined;
  const createdAt = new Date().toISOString();
  const output = resolve(
    values.output ??
      join("performance-results", `${values.label}-${createdAt.replace(/[:.]/g, "-")}`),
  );
  await mkdir(dirname(output), { recursive: true });
  await mkdir(output, { recursive: false });
  const revision = (await runFile("git", ["rev-parse", "HEAD"])).stdout.trim();
  const dirty = Boolean((await runFile("git", ["status", "--porcelain"])).stdout.trim());
  console.log("Building production styles…");
  await runFile("pnpm", ["build:styles"]);
  const temporary = await mkdtemp(join(tmpdir(), "drinks-performance-"));
  let server: Awaited<ReturnType<typeof startPerformanceServer>> | undefined;
  let currentBrowser: Browser | undefined;
  const controller = new AbortController();
  const onInterrupt = () => {
    controller.abort(new Error("Performance run interrupted"));
    void currentBrowser?.close().catch(() => {});
  };
  process.once("SIGINT", onInterrupt);
  process.once("SIGTERM", onInterrupt);
  process.once("SIGHUP", onInterrupt);
  try {
    server = await startPerformanceServer(
      sourceDatabase,
      paths,
      temporary,
      output,
      controller.signal,
    );
    console.log(
      `Copied ${server.catalog.publishedDrinks} Published drinks. Measuring ${profiles.join(" + ")} over ${runs} runs per page.`,
    );
    const summary: Summary = {
      schemaVersion: 1,
      label: values.label,
      createdAt,
      revision,
      dirty,
      node: process.version,
      browser: "",
      lighthouse: "",
      host: hostname(),
      catalog: server.catalog,
      samples: [],
    };
    // Alternate profiles within rounds instead of completing all samples of one first.
    for (let run = 1; run <= runs; run++) {
      for (const profile of profiles) {
        for (let index = 0; index < paths.length; index++) {
          controller.signal.throwIfAborted();
          const path = paths[index];
          const directory = `${profile}-page${index + 1}-run${run}`;
          const sampleDirectory = join(output, directory);
          await mkdir(sampleDirectory);
          const port = await availablePort();
          // Full bundled Chrome, isolated per sample; only trust our ephemeral certificate.
          const browser = await chromium.launch({
            executablePath: chromium.executablePath(),
            // The runner owns signal cleanup, including the server and database.
            handleSIGINT: false,
            handleSIGTERM: false,
            handleSIGHUP: false,
            args: [
              `--remote-debugging-port=${port}`,
              `--ignore-certificate-errors-spki-list=${server.spki}`,
            ],
          });
          currentBrowser = browser;
          try {
            controller.signal.throwIfAborted();
            console.log(`${profile} ${path} — sample ${run}/${runs} (${throttling})`);
            const flags: Flags = {
              port,
              output: "json",
              logLevel: "error",
              onlyCategories: ["performance"],
              throttlingMethod: throttling,
              disableStorageReset: false,
              throttling: {
                ...(profile === "desktop" ? presets.desktopDense4G : presets.mobileSlow4G),
                // Lighthouse's desktop preset disables actual network throttling.
                // Apply its documented DevTools correction factors for this mode.
                ...(throttling === "devtools" && profile === "desktop"
                  ? {
                      requestLatencyMs: 40 * 3.75,
                      downloadThroughputKbps: 10240 * 0.9,
                      uploadThroughputKbps: 10240 * 0.9,
                    }
                  : {}),
                ...(cpu === undefined ? {} : { cpuSlowdownMultiplier: cpu }),
              },
            };
            const result = await lighthouse(
              new URL(path, server.url).href,
              flags,
              profile === "desktop" ? desktopConfig : undefined,
            );
            if (!result) throw new Error("Lighthouse returned no result");
            await writeFile(
              join(sampleDirectory, "report.json"),
              JSON.stringify(result.lhr, null, 2),
            );
            await writeFile(
              join(sampleDirectory, "report.html"),
              generateReport(result.lhr, "html"),
            );
            const sample = sampleFromReport(result.lhr, profile, path, `${directory}/report.html`);
            await saveTrace(result.artifacts.Trace, join(sampleDirectory, "trace.json"));
            await saveDevtoolsLog(
              result.artifacts.DevtoolsLog,
              join(sampleDirectory, "devtoolslog.json"),
            );
            if (result.lhr.runWarnings.length) console.warn(result.lhr.runWarnings.join("\n"));
            summary.browser = browser.version();
            summary.lighthouse = result.lhr.lighthouseVersion;
            summary.samples.push(sample);
            await writeFile(join(output, "summary.json"), JSON.stringify(summary, null, 2));
            await writeFile(join(output, "index.html"), renderSummary(summary, baseline));
            console.log(
              `  Score ${sample.score.toFixed(0)} · TBT ${sample.tbt.toFixed(1)} ms · LCP ${sample.lcp.toFixed(0)} ms`,
            );
          } finally {
            await browser.close();
            currentBrowser = undefined;
          }
        }
      }
    }
    printSummary(summary, baseline);
    console.log(
      `\nReports: ${join(output, "index.html")}\nBaseline for the next run: ${join(output, "summary.json")}`,
    );
  } catch (error) {
    controller.signal.throwIfAborted();
    throw error;
  } finally {
    process.removeListener("SIGINT", onInterrupt);
    process.removeListener("SIGTERM", onInterrupt);
    process.removeListener("SIGHUP", onInterrupt);
    await server?.close();
    await rm(temporary, { recursive: true, force: true });
  }
}

try {
  await main();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
