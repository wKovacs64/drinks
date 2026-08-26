import type { Config } from "@react-router/dev/config";

export default {
  allowedActionOrigins: ["drinks.fyi"],
  future: {
    unstable_optimizeDeps: true,
  },
  ssr: true,
} satisfies Config;
