import { readFile } from "node:fs/promises";
import {
  array,
  boolean,
  literal,
  number,
  object,
  parse,
  string,
  type InferOutput,
} from "remix/data-schema";
import type { Result } from "lighthouse";

export const measurements = [
  ["score", "Performance", "points"],
  ["fcp", "FCP", "ms"],
  ["lcp", "LCP", "ms"],
  ["tbt", "TBT", "ms"],
  ["cls", "CLS", ""],
  ["speedIndex", "Speed Index", "ms"],
] as const;

const sampleSchema = object({
  profile: string(),
  path: string(),
  report: string(),
  settings: string(),
  score: number(),
  fcp: number(),
  lcp: number(),
  tbt: number(),
  cls: number(),
  speedIndex: number(),
});
const summarySchema = object({
  schemaVersion: literal(1),
  label: string(),
  createdAt: string(),
  revision: string(),
  dirty: boolean(),
  node: string(),
  browser: string(),
  lighthouse: string(),
  host: string(),
  catalog: object({ sha256: string(), publishedDrinks: number() }),
  samples: array(sampleSchema),
});
export type Sample = InferOutput<typeof sampleSchema>;
export type Summary = InferOutput<typeof summarySchema>;

export function sampleFromReport(
  result: Result,
  profile: string,
  path: string,
  report: string,
): Sample {
  if (result.runtimeError) throw new Error(`Lighthouse failed: ${result.runtimeError.message}`);
  const score = result.categories.performance?.score;
  if (typeof score !== "number") throw new Error("Lighthouse did not produce a performance score");
  const metric = (id: string) => {
    const value = result.audits[id]?.numericValue;
    if (typeof value !== "number" || !Number.isFinite(value))
      throw new Error(`Missing metric: ${id}`);
    return value;
  };
  return {
    profile,
    path,
    report,
    settings: JSON.stringify({
      formFactor: result.configSettings.formFactor,
      screenEmulation: result.configSettings.screenEmulation,
      throttling: result.configSettings.throttling,
      throttlingMethod: result.configSettings.throttlingMethod,
    }),
    score: score * 100,
    fcp: metric("first-contentful-paint"),
    lcp: metric("largest-contentful-paint"),
    tbt: metric("total-blocking-time"),
    cls: metric("cumulative-layout-shift"),
    speedIndex: metric("speed-index"),
  };
}

export async function readSummary(path: string): Promise<Summary> {
  const value: unknown = JSON.parse(await readFile(path, "utf8"));
  return parse(summarySchema, value);
}

export function median(values: number[]) {
  const sorted = values.toSorted((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

const format = (value: number, unit: string) =>
  `${value.toFixed(unit ? 1 : 3)}${unit ? ` ${unit}` : ""}`;
const compareStrings = (a: string, b: string) => a.localeCompare(b);
const escapeHtml = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[character] ?? character,
  );

export function comparisonWarnings(summary: Summary, baseline: Summary) {
  const warnings: string[] = [];
  for (const key of ["node", "browser", "lighthouse", "host"] as const) {
    if (summary[key] !== baseline[key]) warnings.push(`${key} differs from the baseline`);
  }
  if (summary.catalog.sha256 !== baseline.catalog.sha256)
    warnings.push("Published Drink catalog differs from the baseline");
  const groups = new Set(summary.samples.map((sample) => `${sample.profile} ${sample.path}`));
  const baselineGroups = new Set(
    baseline.samples.map((sample) => `${sample.profile} ${sample.path}`),
  );
  if (
    JSON.stringify([...groups].toSorted(compareStrings)) !==
    JSON.stringify([...baselineGroups].toSorted(compareStrings))
  ) {
    warnings.push("Profile/page coverage differs from the baseline");
  }
  for (const sample of summary.samples) {
    const previous = baseline.samples.find(
      (entry) => entry.profile === sample.profile && entry.path === sample.path,
    );
    if (previous && sample.settings !== previous.settings) {
      warnings.push(`Settings differ for ${sample.profile} ${sample.path}`);
    }
  }
  return [...new Set(warnings)];
}

export function renderSummary(summary: Summary, baseline?: Summary) {
  const groups = [...new Set(summary.samples.map((sample) => `${sample.profile} ${sample.path}`))];
  const sections = groups
    .map((group) => {
      const samples = summary.samples.filter(
        (sample) => `${sample.profile} ${sample.path}` === group,
      );
      const previous =
        baseline?.samples.filter((sample) => `${sample.profile} ${sample.path}` === group) ?? [];
      const rows = measurements
        .map(([key, label, unit]) => {
          const values = samples.map((sample) => sample[key]);
          const current = median(values);
          const before = previous.length
            ? median(previous.map((sample) => sample[key]))
            : undefined;
          const delta = before === undefined ? "—" : format(current - before, unit);
          return `<tr><td>${label}</td><td>${format(current, unit)}</td><td>${format(Math.min(...values), unit)}–${format(Math.max(...values), unit)}</td>${baseline ? `<td>${before === undefined ? "—" : format(before, unit)}</td><td>${delta}</td>` : ""}</tr>`;
        })
        .join("");
      return `<section><h2>${escapeHtml(group)} · ${samples.length} samples</h2><div class="scroll"><table><thead><tr><th>Metric</th><th>Median</th><th>Range</th>${baseline ? "<th>Baseline median</th><th>Change</th>" : ""}</tr></thead><tbody>${rows}</tbody></table></div><p>${samples.map((sample, index) => `<a href="${escapeHtml(sample.report)}">Run ${index + 1}</a>`).join(" · ")}</p></section>`;
    })
    .join("");
  const warnings = baseline ? comparisonWarnings(summary, baseline) : [];
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(summary.label)} — Drinks performance</title><style>body{font:15px system-ui;max-width:1000px;margin:32px auto;padding:0 20px;color:#18212c;background:#fafafa}h1{font-size:26px}h2{font-size:19px}p{line-height:1.6}section{margin:28px 0}.scroll{overflow-x:auto}table{border-collapse:collapse;width:100%;font-variant-numeric:tabular-nums}td,th{padding:10px;text-align:right;border-bottom:1px solid #ccc;white-space:nowrap}td:first-child,th:first-child{text-align:left}a{color:#155eaa}.warning{color:#8a3800}code{font-size:13px}</style></head><body><h1>${escapeHtml(summary.label)}</h1><p>${escapeHtml(summary.revision)}${summary.dirty ? " + working tree changes" : ""} · ${summary.catalog.publishedDrinks} Published drinks · ${escapeHtml(summary.createdAt)}<br>${escapeHtml(summary.browser)} · Lighthouse ${escapeHtml(summary.lighthouse)} · Node ${escapeHtml(summary.node)}</p>${baseline ? `<p>Compared with <strong>${escapeHtml(baseline.label)}</strong>. Negative timing changes mean less time; positive score changes mean a higher score.</p>` : ""}${warnings.map((warning) => `<p class="warning">Comparison warning: ${escapeHtml(warning)}</p>`).join("")}${sections}<p>Production app · local HTTPS/HTTP2 and Brotli · warmed origin and immutable asset cache · fresh browser per sample. External image CDN requests remain live. These are local lab measurements, not field data or a prediction of the deployed score.</p><p>Each linked Lighthouse report has its JSON, raw <code>trace.json</code>, and <code>devtoolslog.json</code> beside it. With simulated throttling the raw trace timings differ from the simulated metric values. Use DevTools throttling for task-level investigation.</p></body></html>`;
}

export function printSummary(summary: Summary, baseline?: Summary) {
  if (baseline)
    for (const warning of comparisonWarnings(summary, baseline))
      console.warn(`Comparison warning: ${warning}`);
  for (const group of new Set(
    summary.samples.map((sample) => `${sample.profile} ${sample.path}`),
  )) {
    const samples = summary.samples.filter(
      (sample) => `${sample.profile} ${sample.path}` === group,
    );
    console.log(`\n${group} (${samples.length} samples; median [min–max])`);
    for (const [key, label, unit] of measurements) {
      const values = samples.map((sample) => sample[key]);
      const previous =
        baseline?.samples.filter((sample) => `${sample.profile} ${sample.path}` === group) ?? [];
      const delta = previous.length
        ? `; change ${format(median(values) - median(previous.map((sample) => sample[key])), unit)}`
        : "";
      console.log(
        `  ${label}: ${format(median(values), unit)} [${format(Math.min(...values), unit)}–${format(Math.max(...values), unit)}]${delta}`,
      );
    }
  }
}
