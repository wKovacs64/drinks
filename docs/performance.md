# Local performance measurements

Use local Lighthouse to compare changes without deploying or sending the page to PageSpeed Insights.
The workflow runs the production app, copies your local SQLite catalog, and serves the app through a
loopback HTTPS/HTTP2 proxy with Brotli compression. It warms the origin and immutable asset cache,
then launches a fresh Chrome instance for every measured navigation. It does not use the development
server or HMR.

## Setup and first baseline

Install dependencies and full Chromium (the test suite's `--only-shell` installation is insufficient):

```sh
pnpm install
pnpm exec playwright install chromium
```

OpenSSL must be on `PATH`. The runner creates an ephemeral localhost certificate and tells its
isolated Chrome instance to trust only that certificate's public key. It does not change your
system certificate store.

The default catalog is `DATABASE_URL` from `.env`, falling back to `data/drinks.db`. It must contain
Published drinks. SQLite's backup API takes a consistent disposable copy, including committed WAL
data; migrations run against that copy. The lab uses placeholder integration credentials and accepts
only GET/HEAD requests.

```sh
pnpm perf --label baseline --output performance-results/baseline
```

In a worktree without a local catalog, point at your existing one:

```sh
pnpm perf --database /path/to/drinks.db --label baseline --output performance-results/baseline
```

By default this measures `/` three times each with the standard Lighthouse mobile and desktop
profiles. Runs alternate profiles. The script builds production styles automatically; you can leave
your ordinary development server running, though other work on the machine can affect timings.

## Iteration

Make a change, then compare against the saved baseline:

```sh
pnpm perf --label candidate --compare performance-results/baseline/summary.json
```

The terminal and `index.html` show medians, min/max ranges, and changes from the baseline. Each sample
has its own Lighthouse HTML/JSON report, raw `trace.json`, and `devtoolslog.json`. Open `index.html`
locally and follow its run links. To inspect a task, load that sample's trace file into Chrome
DevTools' Performance panel.

Results live under gitignored `performance-results/`. Default output directories include a timestamp.
Explicit `--output` directories must be new so a baseline is not silently overwritten. Keep the same
catalog, machine, browser version, paths, and settings for comparisons; summaries flag mismatched
catalog hashes, environments, page coverage, or throttling settings. Use at least three samples when
deciding whether an improvement is consistent. A one-run desktop check is useful during editing:

```sh
pnpm perf --profile desktop --runs 1 --label quick
```

Measure additional public pages by repeating `--path`:

```sh
pnpm perf --profile mobile --path / --path '/search?q=tequila' --path /black-manhattan
```

Use paths that exist in your local catalog. These are anonymous navigation audits; an Admin URL does
not provide an authenticated Admin measurement. The lab does not exercise soft navigation, search
submission, scrolling, or other interaction latency.

## Simulation versus recorded execution

The default `--throttling simulate` uses Lighthouse's PageSpeed-style simulation. It targets the
standard mobile network (150 ms RTT, approximately 1.6 Mbps download, 4× CPU slowdown) and desktop
network (40 ms RTT, 10 Mbps download, 1× CPU). Exact settings are saved in every sample report and
summary. The machine's benchmark index is available in the Lighthouse JSON/HTML reports.

With simulation, the recorded browser trace is collected before the simulation. Its timestamps and
long tasks do not directly equal the reported simulated FCP, LCP, or TBT.

For investigating an individual blocking task, use actual DevTools throttling:

```sh
pnpm perf --profile desktop --throttling devtools --runs 3 --label desktop-trace
pnpm perf --profile mobile --throttling devtools --runs 3 --label mobile-trace
```

This mode applies request-level network and CPU throttling during execution. The desktop profile's
normally disabled DevTools network values are populated using Lighthouse's correction factors for
the same 40 ms/10 Mbps target. Request-level throttling approximates a connection; it does not model
packet loss or packet-level timing. It is slower than simulation. Compare runs within the same mode.

To stress startup work or use a calibrated CPU slowdown, override the multiplier explicitly:

```sh
pnpm perf --profile desktop --throttling devtools --cpu 4 --runs 3 --label startup-stress
```

A multiplier is relative to your CPU, not a guarantee of a particular phone's speed. Keep it fixed
between comparisons and avoid running heavy jobs concurrently.

## What this models

The lab preserves the production module graph, minification, fingerprints, import maps, rendering,
responsive image URLs, HTTP/2 multiplexing, and compressed text transfers. Fresh browser processes
provide cold browser/Service Worker state. Server compilation and immutable proxy caches are warmed,
so results describe a first browser visit to a warm origin, not a cold deployment or a repeat visit.

ImageKit image requests remain live and can vary with its CDN caches and the network. The auditing
service is entirely local, but this is not an offline image replay system. Keep the catalog stable
and inspect failed resources in the sample reports.

The local proxy is not Fly or Fastly: origin latency, edge caching, regional routing, HTTP/3, CPU
calibration, and third-party connection costs differ. Match your baseline locally, rather than
expecting the same numerical score as PageSpeed. These navigation metrics are lab data; they do not
measure real-user INP or establish field Core Web Vitals compliance.

References: [Lighthouse's Node API](https://github.com/GoogleChrome/lighthouse/blob/main/docs/readme.md#using-programmatically),
[throttling](https://github.com/GoogleChrome/lighthouse/blob/main/docs/throttling.md), and
[measurement variability](https://github.com/GoogleChrome/lighthouse/blob/main/docs/variability.md).
