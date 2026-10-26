import { createConfig } from "@wkovacs64/oxlint-config";

export default createConfig(
  {
    jsPlugins: ["./lint-rules/route-matching.js"],
    overrides: [
      {
        // Server request handling must match URLs the way the router does.
        files: ["app/**/*.{ts,tsx}", "server.ts"],
        rules: { "route-matching/no-raw-pathname-match": "error" },
      },
      {
        files: ["app/**/public/**", "app/**/*.test.{ts,tsx}"],
        rules: { "route-matching/no-raw-pathname-match": "off" },
      },
    ],
  },
  {
    react: false,
    jsxA11y: true,
    moduleBoundaries: { modulesPath: "#/app/modules" },
  },
);
