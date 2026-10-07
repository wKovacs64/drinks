import { test, describe } from "remix/test";
import { expect } from "remix/assert";
import { createBrowserPage } from "#/test/e2e.ts";
import { getDb } from "#/app/db/client.server.ts";
import { drinks, users } from "#/app/db/schema.ts";
import { TEST_ADMIN_USER } from "#/test/database.ts";
import { EDITOR_RESPONSE_MEDIA_TYPE } from "#/app/web/admin-drink-write/public/editor-response.ts";

for (const actor of ["anonymous", "user"]) {
  test(`${actor} cannot read or write admin routes through encoded URLs`, async (testContext) => {
    const page = await createBrowserPage(testContext, { admin: actor === "user" });
    if (actor === "user") await getDb().update(users, TEST_ADMIN_USER.id, { role: "user" });
    const destination = actor === "anonymous" ? "/login" : "/unauthorized";
    for (const path of [
      "/%61dmin",
      "/%61dmin/",
      "/ad%6Din/drinks",
      "/%61dmin/%64rinks/%6Eew",
      "/%61dmin/drinks/test-margarita/%65dit",
      "/%61dmin/drinks/test-margarita/delete",
    ]) {
      const response = await page.request.get(path, { maxRedirects: 0 });
      expect(response.status()).toBe(302);
      expect(response.headers().location).toBe(destination);
      expect(response.headers()["cache-control"]).toBe("private, no-store");
    }
    for (const path of [
      "/%61dmin/drinks/new",
      "/ad%6din/drinks/test-margarita/edit",
      "/%61dmin/drinks/test-margarita/delete",
    ]) {
      const response = await page.request.post(path, { maxRedirects: 0 });
      expect(response.status()).toBe(302);
      expect(response.headers().location).toBe(destination);
      expect(response.headers()["cache-control"]).toBe("private, no-store");
    }
    for (const path of ["/%61dmin/%64rinks/%6Eew", "/ad%6din/drinks/test-margarita/%65dit"]) {
      const response = await page.request.post(path, {
        headers: { Accept: EDITOR_RESPONSE_MEDIA_TYPE },
        maxRedirects: 0,
      });
      expect(response.status()).toBe(200);
      expect(await response.json()).toEqual({
        kind: "navigate",
        location: destination,
        document: actor === "anonymous",
      });
      expect(response.headers()["cache-control"]).toBe("private, no-store");
    }
    expect(await getDb().query(drinks).count()).toBe(3);
    expect((await page.request.get("/test-margarita")).status()).toBe(200);
  });
}

test("admin can read and submit an encoded editor URL", async (testContext) => {
  const page = await createBrowserPage(testContext, { admin: true });
  const path = "/%61dmin/%64rinks/test-margarita/%65dit";
  const response = await page.request.get(path);
  expect(response.status()).toBe(200);
  expect(await response.text()).toContain("Update Drink");
  expect(response.headers()["cache-control"]).toBe("private, no-store");
  const submission = await page.request.post(path, {
    headers: { Accept: EDITOR_RESPONSE_MEDIA_TYPE },
    multipart: {
      title: "Encoded Margarita",
      slug: "test-margarita",
      ingredients: "2 oz tequila",
      calories: "200",
      tags: "tequila, citrus",
      notes: "",
      rank: "10",
      status: "published",
    },
    maxRedirects: 0,
  });
  expect(submission.status()).toBe(200);
  expect(await submission.json()).toEqual({
    kind: "navigate",
    location: "/admin/drinks",
    document: false,
  });
  expect(submission.headers()["cache-control"]).toBe("private, no-store");
  const drink = await getDb().query(drinks).where({ slug: "test-margarita" }).first();
  expect(drink?.title).toBe("Encoded Margarita");
});

describe("Authentication", () => {
  test("unauthenticated user is redirected to login when accessing admin", async (testContext) => {
    const page = await createBrowserPage(testContext);
    const response = await page.request.get("/admin/drinks", { maxRedirects: 0 });
    expect(response.status()).toBe(302);
    expect(response.headers().location).toBe("/login");
    expect(response.headers()["cache-control"]).toBe("private, no-store");
  });

  test("admin can logout", async (testContext) => {
    const pageAsAdmin = await createBrowserPage(testContext, { admin: true });
    await pageAsAdmin.goto("/admin/drinks");
    await pageAsAdmin.waitForFunction(() => document.documentElement.dataset.remixReady === "true");

    await pageAsAdmin.getByText("admin@test.com").waitFor();

    // Click logout
    await pageAsAdmin.getByRole("button", { name: "Sign out" }).click();

    // Should be redirected to home
    await pageAsAdmin.waitForURL("/");
    const response = await pageAsAdmin.request.get("/admin/drinks", { maxRedirects: 0 });
    expect(response.headers().location).toBe("/login");
  });
});

test("admin permissions are checked from the database on every request", async (testContext) => {
  const pageAsAdmin = await createBrowserPage(testContext, { admin: true });
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
