import { createConfig } from "@wkovacs64/oxlint-config";

export default createConfig(
  {},
  {
    react: false,
    jsxA11y: true,
    moduleBoundaries: { modulesPath: "#/app/modules" },
  },
);
