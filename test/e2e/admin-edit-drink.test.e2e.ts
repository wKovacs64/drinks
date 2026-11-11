import { test, describe } from "remix/test";
import { expect } from "remix/assert";
import { createBrowserPage } from "#/test/e2e.ts";
import { getDb } from "#/app/db/client.ts";
import { users } from "#/app/db/schema.ts";
import { TEST_ADMIN_USER } from "#/test/database.ts";

describe("Edit Drink", () => {
  test("editing preserves values after duplicate-slug validation and succeeds on retry", async (testContext) => {
    const pageAsAdmin = await createBrowserPage(testContext, { admin: true });
    await pageAsAdmin.goto("/admin/drinks/test-margarita/edit");
    await pageAsAdmin.waitForFunction(() => document.documentElement.dataset.remixReady === "true");

    // Should see the form pre-filled with existing values
    await pageAsAdmin.getByRole("heading", { name: "Edit Drink" }).waitFor();
    expect(await pageAsAdmin.getByLabel("Title").inputValue()).toBe("Test Margarita");
    expect(await pageAsAdmin.getByLabel("Slug").inputValue()).toBe("test-margarita");
    expect(await pageAsAdmin.getByLabel("Calories").inputValue()).toBe("200");

    // Update the title
    await pageAsAdmin.getByLabel("Title").fill("Updated Margarita");
    expect(await pageAsAdmin.getByLabel("Slug").inputValue()).toBe("test-margarita");
    await pageAsAdmin.getByLabel("Slug").fill("test-mojito");
    await pageAsAdmin.getByRole("button", { name: "Update Drink" }).click();
    await pageAsAdmin.getByRole("alert").filter({ hasText: "Slug already exists" }).waitFor();
    expect(await pageAsAdmin.getByLabel("Title").inputValue()).toBe("Updated Margarita");
    expect(await pageAsAdmin.getByLabel("Slug").inputValue()).toBe("test-mojito");
    expect(new URL(pageAsAdmin.url()).pathname).toBe("/admin/drinks/test-margarita/edit");
    await pageAsAdmin.getByLabel("Slug").fill("test-margarita");

    // Submit the form
    await pageAsAdmin.getByRole("button", { name: "Update Drink" }).click();

    // Should redirect to drinks list
    await pageAsAdmin.waitForURL("/admin/drinks");

    // Updated drink should appear in list
    await pageAsAdmin.getByRole("cell", { name: "Updated Margarita" }).waitFor();
    await pageAsAdmin.getByRole("status").filter({ hasText: "Drink updated!" }).waitFor();
  });
});

test("an editor submission follows changed admin permissions", async (testContext) => {
  const page = await createBrowserPage(testContext, { admin: true });
  await page.goto("/admin/drinks/test-margarita/edit");
  await page.waitForFunction(() => document.documentElement.dataset.remixReady === "true");
  await getDb().update(users, TEST_ADMIN_USER.id, { role: "user" });
  const visitedAdminList: string[] = [];
  page.on("request", (request) => {
    if (new URL(request.url()).pathname === "/admin/drinks") visitedAdminList.push(request.url());
  });
  await page.getByRole("button", { name: "Update Drink" }).click();
  await page.waitForURL("/unauthorized", { timeout: 3000 });
  await page.getByRole("heading", { name: "Unauthorized" }).waitFor();
  expect(visitedAdminList).toEqual([]);
});

test("an editor with a lost session shows a sign-in page that uses document navigation", async (testContext) => {
  const page = await createBrowserPage(testContext, { admin: true });
  await page.goto("/admin/drinks/test-margarita/edit");
  await page.waitForFunction(() => document.documentElement.dataset.remixReady === "true");
  await page.context().clearCookies();
  const oauthDestination = Promise.withResolvers<string>();
  // Inspect the real login response before the external OAuth boundary. Browser interception
  // matches the first URL in a redirect chain, so intercept /login rather than Google's URL.
  await page.route("**/login", async (route) => {
    const response = await route.fetch({ maxRedirects: 0 });
    expect(response.status()).toBe(302);
    oauthDestination.resolve(response.headers().location);
    await route.fulfill({ status: 200, contentType: "text/html", body: "<h1>Google sign in</h1>" });
  });
  const submission = page.waitForResponse((response) => response.request().method() === "POST");
  await page.getByRole("button", { name: "Update Drink" }).click();
  expect((await submission).status()).toBe(401);
  await page.getByRole("heading", { name: "Session Expired" }).waitFor();

  const loginRequest = page.waitForRequest(
    (request) => new URL(request.url()).pathname === "/login" && request.isNavigationRequest(),
  );

  await page.getByRole("link", { name: "Sign in" }).click();
  await loginRequest;
  await page.getByRole("heading", { name: "Google sign in" }).waitFor();
  expect(new URL(await oauthDestination.promise).hostname).toBe("accounts.google.com");
});

test("a Drink removed while editing shows not found", async (testContext) => {
  const page = await createBrowserPage(testContext, { admin: true });
  await page.goto("/admin/drinks/test-margarita/edit");
  await page.waitForFunction(() => document.documentElement.dataset.remixReady === "true");
  await page.getByLabel("Title", { exact: true }).fill("Unsaved Margarita");
  const deletion = await page.request.post("/admin/drinks/test-margarita/delete");
  expect(deletion.ok()).toBe(true);

  const submission = page.waitForResponse(
    (response) =>
      response.request().method() === "POST" && response.url().endsWith("/test-margarita/edit"),
  );

  await page.getByRole("button", { name: "Update Drink" }).click();
  expect((await submission).status()).toBe(404);
  await page.getByRole("heading", { name: "404 Not Found" }).waitFor();
  expect(new URL(page.url()).pathname).toBe("/admin/drinks/test-margarita/edit");
});

test("the editor displays every error and can retry", async (testContext) => {
  const page = await createBrowserPage(testContext, { admin: true });
  await page.goto("/admin/drinks/test-margarita/edit");
  await page.waitForFunction(() => document.documentElement.dataset.remixReady === "true");
  await page.getByLabel("Title", { exact: true }).fill(" ");
  await page.getByLabel("Slug", { exact: true }).fill("Not A Slug");
  await page.getByRole("button", { name: "Update Drink" }).click();
  await page.getByRole("alert").filter({ hasText: "Title is required" }).waitFor();
  expect(await page.getByRole("alert").locator("li").allTextContents()).toEqual([
    "Title is required",
    "Slug must be lowercase letters, numbers, and hyphens",
  ]);
  expect(await page.getByLabel("Slug", { exact: true }).inputValue()).toBe("Not A Slug");
  await page.getByLabel("Title", { exact: true }).fill("Retry Margarita");
  await page.getByLabel("Slug", { exact: true }).fill("test-margarita");
  await page.getByRole("button", { name: "Update Drink" }).click();
  await page.waitForURL("/admin/drinks");
  await page.getByRole("cell", { name: "Retry Margarita" }).waitFor();
});

test("a save that cannot reach the server reports the failure and can retry", async (testContext) => {
  const page = await createBrowserPage(testContext, { admin: true });
  await page.goto("/admin/drinks/test-margarita/edit");
  await page.waitForFunction(() => document.documentElement.dataset.remixReady === "true");
  await page.route("**/admin/drinks/test-margarita/edit", (route) =>
    route.request().method() === "POST" ? route.abort() : route.fallback(),
  );
  const saveButton = page.getByRole("button", { name: "Update Drink" });
  await saveButton.click();
  await page.getByRole("alert").filter({ hasText: "Unable to save drink." }).waitFor();
  expect(await saveButton.isEnabled()).toBe(true);
  await page.unrouteAll();
  await saveButton.click();
  await page.waitForURL("/admin/drinks");
  await page.getByRole("status").filter({ hasText: "Drink updated!" }).waitFor();
});
