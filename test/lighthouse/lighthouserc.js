import { chromium } from "playwright";

const lockfilePinnedPlaywrightChromiumPath = chromium.executablePath();

const baseUrl = "http://localhost:4173";

const sharedAssertions = {
  "categories:performance": ["warn", { minScore: 0.9, aggregationMethod: "median" }],
  "largest-contentful-paint": ["warn", { maxNumericValue: 2500, aggregationMethod: "median" }],
  "total-blocking-time": ["warn", { maxNumericValue: 200, aggregationMethod: "median" }],
  "cumulative-layout-shift": ["error", { maxNumericValue: 0.05, aggregationMethod: "median" }],
  "server-response-time": ["warn", { maxNumericValue: 200, aggregationMethod: "median" }],
};

/** @param {number} maxBytes */
function scriptBudget(maxBytes) {
  return ["error", { maxNumericValue: maxBytes, aggregationMethod: "median" }];
}

export default {
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
      chromePath: lockfilePinnedPlaywrightChromiumPath,
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
