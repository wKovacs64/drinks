import baseConfig from "@wkovacs64/eslint-config";

export default [
  ...baseConfig,
  {
    ignores: ["app/modules/**", "app/db/**"],
    rules: {
      "@typescript-eslint/no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              regex: "#/app/modules/.+/.+(?<!index\\.server)$",
              message: "Import from the module's public API (index.ts or index.server.ts) instead.",
            },
            {
              regex: "#/app/db/.+(?<!index\\.server)$",
              message: "Import from the db barrel (index.ts or index.server.ts) instead.",
            },
          ],
        },
      ],
    },
  },
];
