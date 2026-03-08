import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["app/**/*.test.ts"],
    env: loadEnv("test", process.cwd(), ""),
    setupFiles: ["./test/setup.ts"],
    // Tests share a single SQLite file, so they must run sequentially
    fileParallelism: false,
  },
});
