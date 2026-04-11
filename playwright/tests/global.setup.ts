import { test as setup, request } from "@playwright/test";

/**
 * Send a warm-up request so Vite's dependency optimization completes before any
 * real tests run. Without this, the first test can hit Vite mid-optimization
 * and fail with module loading errors.
 */
setup("warm up dev server", async ({ baseURL }) => {
  const api = await request.newContext({ baseURL });
  await api.get("/");
  await api.dispose();
});
