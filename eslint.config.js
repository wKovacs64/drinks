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
              regex: "#/app/modules/([^/]+)/(?!\\1(\\.server)?$)",
              message:
                "Import from the module's public API (<module>.ts or <module>.server.ts) instead.",
            },
          ],
        },
      ],
    },
  },
];
