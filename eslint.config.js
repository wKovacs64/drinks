import { readdirSync } from "node:fs";
import baseConfig from "@wkovacs64/eslint-config";

const moduleBoundaryMessage =
  "Import from the module's public API (<module>.ts or <module>.server.ts) instead.";

const moduleOverrides = readdirSync("app/modules", { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => ({
    files: [`app/modules/${entry.name}/**`],
    rules: {
      "@typescript-eslint/no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              regex: `#/app/modules/(?!${entry.name}/)([^/]+)/(?!\\1(\\.server)?$)`,
              message: moduleBoundaryMessage,
            },
          ],
        },
      ],
    },
  }));

export default [
  ...baseConfig,
  // Module boundary: files outside modules can't import module internals
  {
    ignores: ["app/modules/**"],
    rules: {
      "@typescript-eslint/no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              regex: "#/app/modules/([^/]+)/(?!\\1(\\.server)?$)",
              message: moduleBoundaryMessage,
            },
          ],
        },
      ],
    },
  },
  // Module boundary: modules can't import other modules' internals
  ...moduleOverrides,
];
