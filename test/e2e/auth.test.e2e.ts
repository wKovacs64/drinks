import { test, describe } from "remix/test";
import { expect } from "remix/assert";
import { createBrowserPage } from "#/test/e2e.ts";

describe("Authentication", () => {
  test("unauthenticated user is redirected to login when accessing admin", async (testContext) => {
    const page = await createBrowserPage(testContext);
    // Check that the first redirect goes to /login (before OAuth redirect)
    const response = await page.goto("/admin", { waitUntil: "commit" });

    // The middleware should redirect to /login
    const requestUrl = new URL(response?.url() ?? "");

    // Either we're at /login or redirecting to Google OAuth (which means we went through /login)
    const wentThroughLogin = requestUrl.pathname === "/login" || requestUrl.host.includes("google");
    expect(wentThroughLogin).toBe(true);
  });

  test("authenticated admin can access admin pages", async (testContext) => {
    const pageAsAdmin = await createBrowserPage(testContext, { admin: true });
    await pageAsAdmin.goto("/admin/drinks");
    await pageAsAdmin.waitForFunction(() => document.documentElement.dataset.remixReady === "true");

    // Should see the admin drinks page
    await pageAsAdmin.getByRole("heading", { name: "Drinks", exact: true }).waitFor();

    // Should see the user email in header
    await pageAsAdmin.getByText("admin@test.com").waitFor();
  });

  test("admin can logout", async (testContext) => {
    const pageAsAdmin = await createBrowserPage(testContext, { admin: true });
    await pageAsAdmin.goto("/admin/drinks");
    await pageAsAdmin.waitForFunction(() => document.documentElement.dataset.remixReady === "true");

    // Click logout
    await pageAsAdmin.getByRole("button", { name: "Sign out" }).click();

    // Should be redirected to home
    await pageAsAdmin.waitForURL("/");
  });
});

test("admin permissions are checked from the database on every request", async (testContext) => {
  const pageAsAdmin = await createBrowserPage(testContext, { admin: true });
  const { getDb } = await import("#/app/db/client.server.ts");
  const { users } = await import("#/app/db/schema.ts");
  const { TEST_ADMIN_USER } = await import("#/test/database.ts");
  await pageAsAdmin.goto("/admin/drinks");
  await pageAsAdmin.waitForFunction(() => document.documentElement.dataset.remixReady === "true");
  await getDb().update(users, TEST_ADMIN_USER.id, { role: "user" });
  const response = await pageAsAdmin.request.get("/admin/drinks", { maxRedirects: 0 });
  expect(response.status()).toBe(302);
  expect(response.headers().location).toBe("/unauthorized");
  expect(response.headers()["cache-control"]).toBe("private, no-store");
  const mutation = await pageAsAdmin.request.post("/admin/drinks/test-margarita/delete", {
    maxRedirects: 0,
  });
  expect(mutation.status()).toBe(302);
  expect(mutation.headers().location).toBe("/unauthorized");
  expect(mutation.headers()["cache-control"]).toBe("private, no-store");
  const publicResponse = await pageAsAdmin.request.get("/test-margarita");
  expect(publicResponse.status()).toBe(200);
});

test("cross-origin admin submissions are rejected", async (testContext) => {
  const pageAsAdmin = await createBrowserPage(testContext, { admin: true });
  const response = await pageAsAdmin.request.post("/admin/drinks/test-margarita/delete", {
    headers: { Origin: "https://another.example" },
    maxRedirects: 0,
  });
  expect(response.status()).toBe(403);
  const drink = await pageAsAdmin.request.get("/test-margarita");
  expect(drink.status()).toBe(200);
});
