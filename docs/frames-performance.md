# Search Frame performance comparison

The app uses one named, blocking `search-results` Frame. Compressed search-update HTML is **54%
smaller** than the complete-document implementation. Update readiness is approximately unchanged in
both measured profiles. Initial constrained readiness increases by about 20 ms (1%). The retained
Frame provides a smaller response and a bounded update region; these results do not establish a
latency improvement.

The admin drinks list uses ordinary deletion forms and native redirects, with no named Frame or
separate deletion response protocol. Its sorting, filtering, and notifications continue through
Remix document reconciliation.

## Results

Medians across two runs per implementation and profile, using the final search-only implementation.
Body sizes include HTML and hydration metadata. Byte medians below pool both profiles.

| Response            | Original HTML | Frame HTML | Original gzip | Frame gzip |
| ------------------- | ------------: | ---------: | ------------: | ---------: |
| Search update       |      47,274 B |   25,146 B |       4,779 B |    2,186 B |
| Initial search page |      48,052 B |   48,329 B |       4,807 B |    4,899 B |

| Interaction              | Local original | Local Frame | Constrained original | Constrained Frame |
| ------------------------ | -------------: | ----------: | -------------------: | ----------------: |
| Initial search readiness |       275.3 ms |    274.6 ms |           1,785.2 ms |        1,804.9 ms |
| Search update            |        38.1 ms |     39.0 ms |             168.8 ms |          169.8 ms |

Initial documents add approximately 92 compressed bytes. The blocking Frame makes an internal GET,
and search reads run twice so the outer document retains its responsive image preloads. Cached search
and placeholder work is reused. These costs are included in the initial-load measurements.

The search Frame changes add 51 net lines of application code relative to the baseline, excluding
tests, measurement tooling, and documentation. The added responsibilities are document/fragment
responses, cache variation, and input synchronization for browser history. Submission remains a
form targeting the Frame rather than a custom browser request protocol.

## Method

- Baseline: `1a1e24d3cb30cc39ababd205802a15337fd5266d`, including the existing rendering and interaction
  optimizations, rebased onto main.
- Candidate: `b4e8599c200e5efbefa58637f186772859ade73d`, with the `search-results` Frame and ordinary admin
  forms. The measurement harness is committed separately; it is identical for both implementations.
- Runtime: production-mode Remix, native Node HTTP test server, Chromium, in-memory SQLite.
- Data: 40 deterministic Drinks based on existing fixtures, fixed timestamps, data-URI photos;
  search alternates between 13 and 14 matching Drinks.
- Profiles: local; and 4× CPU slowdown, 60 ms network latency, 200,000 B/s download, 93,750 B/s upload.
- Compression: the harness simulates the production gzip serving layer for text responses, including
  JavaScript and CSS. It buffers responses before compression; it is not a Fastly deployment and does
  not measure streaming chunk behavior.
- HTTP cache and service-worker interception are disabled for both versions. The server asset graph
  and search index are warmed before retained samples. Initial documents are full navigations with
  browser asset downloads; asset-server compilation is warm. Images use data URIs.
- Per run/profile: five initial loads and twelve search updates. Two runs provide ten initial and
  twenty-four update samples per implementation/profile.
- Run order: candidate, baseline, baseline, candidate. Runs were sequential and did not overlap
  validation or another benchmark.
- Update timing starts at form submission and ends two animation frames after the expected DOM
  change. Initial readiness ends two animation frames after Remix reports hydration complete. These
  are browser readiness/paint proxies, not LCP measurements.

The harness checks final result counts and browser runtime errors. Behavior tests cover search
feedback, repeated/empty queries, query breadcrumbs and Back/Forward input values, server rendering,
cache variants, and operation without browser JavaScript. Admin tests cover native deletion redirects,
sort/filter preservation, repeated notifications, and one-time flash consumption.

The small synthetic catalog is close to this app's scale, but repeated fixture text compresses well.
These results do not establish field performance, cold ImageKit latency, CDN cache hit behavior,
slow-photo LCP, or production OAuth timing. Timing varies between runs; no statistical significance
claim is made.

## Reproduce

Prepare assets, then run the harness explicitly. It is outside ordinary test discovery and refuses
any database other than `:memory:`. `.env.test` contains fixture credentials; no real integration
credentials or persistent database are used.

```sh
pnpm build:styles
NODE_ENV=production DATABASE_URL=:memory: FRAME_MEASUREMENT_OUTPUT=/tmp/frames-candidate.json \
  node --env-file=.env.test node_modules/remix/dist/cli-entry.js \
  test scripts/measure-frames.test.e2e.ts --quiet
```

For the baseline, export the commit to a temporary directory, share installed dependencies, and copy
the same harness into it. Invoke the asset preparation commands directly so pnpm does not attempt to
reinstall into the shared dependency symlink.

```sh
FRAME_BASELINE_DIR=$(mktemp -d /tmp/drinks-search-frame-baseline.XXXXXX)
git archive 1a1e24d3cb30cc39ababd205802a15337fd5266d | tar -x -C "$FRAME_BASELINE_DIR"
ln -s "$PWD/node_modules" "$FRAME_BASELINE_DIR/node_modules"
cp scripts/measure-frames.test.e2e.ts "$FRAME_BASELINE_DIR/scripts/measure-frames.test.e2e.ts"
cd "$FRAME_BASELINE_DIR"
node scripts/prepare-assets.ts
node_modules/.bin/tailwindcss -i app/styles/app.css -o public/app.css --minify
NODE_ENV=production DATABASE_URL=:memory: FRAME_MEASUREMENT_OUTPUT=/tmp/frames-baseline.json \
  node --env-file=.env.test node_modules/remix/dist/cli-entry.js \
  test scripts/measure-frames.test.e2e.ts --quiet
```

[Raw samples](measurements/frames.json) preserve every retained sample and the run order.
The harness is in [scripts/measure-frames.test.e2e.ts](../scripts/measure-frames.test.e2e.ts).
