const { chromium } = require("playwright");

const baseUrl = "http://localhost:4173";
const sharedAssertions = {
  "categories:performance": ["warn", { minScore: 0.9, aggregationMethod: "median" }],
  "largest-contentful-paint": ["error", { maxNumericValue: 2500, aggregationMethod: "median" }],
  // Lab data cannot measure INP; Total Blocking Time is its proxy.
  "total-blocking-time": ["error", { maxNumericValue: 200, aggregationMethod: "median" }],
  "cumulative-layout-shift": ["error", { maxNumericValue: 0.05, aggregationMethod: "median" }],
  "server-response-time": ["error", { maxNumericValue: 200, aggregationMethod: "median" }],
};
/** Uncompressed script bytes: production leaves compression to Fastly and Fly Proxy. */
function scriptBudget(maxBytes) {
  return ["error", { maxNumericValue: maxBytes, aggregationMethod: "median" }];
}

module.exports = {
  ci: {
    collect: {
      startServerCommand:
        "NODE_ENV=production PORT=4173 node --env-file=.env.test --import remix/node-tsx test/lighthouse/server.ts",
      startServerReadyPattern: "is running at",
      url: [
        `${baseUrl}/`,
        `${baseUrl}/test-margarita`,
        `${baseUrl}/search`,
        `${baseUrl}/search?q=citrus`,
      ],
      numberOfRuns: 3,
      // Pin the browser to the Playwright version in the lockfile.
      chromePath: chromium.executablePath(),
      settings: {
        onlyCategories: ["performance"],
        chromeFlags: "--headless=new --no-sandbox",
      },
    },
    assert: {
      assertMatrix: [
        {
          matchingUrlPattern: "/search",
          assertions: {
            ...sharedAssertions,
            "resource-summary:script:size": scriptBudget(220 * 1024),
          },
        },
        {
          matchingUrlPattern: "^(?!.*/search).*$",
          assertions: {
            ...sharedAssertions,
            "resource-summary:script:size": scriptBudget(180 * 1024),
          },
        },
      ],
    },
    upload: {
      target: "filesystem",
      outputDir: ".lighthouseci/reports",
    },
  },
};
