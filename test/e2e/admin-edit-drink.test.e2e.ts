import { test, describe } from "remix/test";
import { expect } from "remix/assert";
import { createBrowserPage } from "#/test/e2e.ts";
import { getDb } from "#/app/db/client.server.ts";
import { users } from "#/app/db/schema.ts";
import { TEST_ADMIN_USER } from "#/test/database.ts";

describe("Edit Drink", () => {
  test("can edit an existing drink", async (testContext) => {
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

    // Submit the form
    await pageAsAdmin.getByRole("button", { name: "Update Drink" }).click();

    // Should redirect to drinks list
    await pageAsAdmin.waitForURL("/admin/drinks");

    // Updated drink should appear in list
    await pageAsAdmin.getByRole("cell", { name: "Updated Margarita" }).waitFor();
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

test("an editor with a lost session uses document navigation for native Google authentication", async (testContext) => {
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
  const loginRequest = page.waitForRequest(
    (request) => new URL(request.url()).pathname === "/login" && request.isNavigationRequest(),
  );
  await page.getByRole("button", { name: "Update Drink" }).click();
  await loginRequest;
  await page.getByRole("heading", { name: "Google sign in" }).waitFor();
  expect(new URL(await oauthDestination.promise).hostname).toBe("accounts.google.com");
});

test("a Drink removed while editing shows the missing target and preserves text", async (testContext) => {
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
  await page.getByRole("alert").filter({ hasText: "Drink not found" }).waitFor();
  expect(await page.getByLabel("Title", { exact: true }).inputValue()).toBe("Unsaved Margarita");
  expect(new URL(page.url()).pathname).toBe("/admin/drinks/test-margarita/edit");
});

test("the editor displays every field and form error and can retry", async (testContext) => {
  const page = await createBrowserPage(testContext, { admin: true });
  await page.goto("/admin/drinks/test-margarita/edit");
  await page.waitForFunction(() => document.documentElement.dataset.remixReady === "true");
  await page.getByLabel("Title", { exact: true }).fill("Retry Margarita");
  // The current domain rules emit field errors; provide a full failure at the browser HTTP seam
  // to exercise the web contract's form errors and multiple messages without inventing a rule.
  await page.route("**/admin/drinks/test-margarita/edit", (route) =>
    route.fulfill({
      status: 400,
      contentType: "application/json",
      body: JSON.stringify({
        kind: "invalid",
        fieldErrors: { slug: ["First slug issue", "Second slug issue"], title: ["Title issue"] },
        formErrors: ["First form issue", "Second form issue"],
      }),
    }),
  );
  await page.getByRole("button", { name: "Update Drink" }).click();
  await page.getByRole("alert").filter({ hasText: "Second form issue" }).waitFor();
  expect(await page.getByRole("alert").locator("li").allTextContents()).toEqual([
    "First form issue",
    "Second form issue",
    "First slug issue",
    "Second slug issue",
    "Title issue",
  ]);
  expect(await page.getByLabel("Title", { exact: true }).inputValue()).toBe("Retry Margarita");
  await page.unroute("**/admin/drinks/test-margarita/edit");
  await page.getByRole("button", { name: "Update Drink" }).click();
  await page.waitForURL("/admin/drinks");
  await page.getByRole("cell", { name: "Retry Margarita" }).waitFor();
});
