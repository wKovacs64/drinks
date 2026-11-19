import { createConfig } from "@wkovacs64/oxlint-config";

export default createConfig(
  {
    jsPlugins: ["./lint-rules/route-matching.js"],
    overrides: [
      {
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
    moduleBoundaries: { modulesPath: "#/app/modules" },
  },
);
