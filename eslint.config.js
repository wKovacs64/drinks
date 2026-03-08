import baseConfig from "@wkovacs64/eslint-config";

export default [
  ...baseConfig,
  {
    ignores: ["app/modules/**"],
    rules: {
      "@typescript-eslint/no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              regex: "#/app/modules/.+/.+(?<!index\\.server)$",
              message: "Import from the module's public API (index.ts or index.server.ts) instead.",
            },
          ],
        },
      ],
    },
  },
];
