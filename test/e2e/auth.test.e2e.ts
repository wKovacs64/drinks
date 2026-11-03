import { test, describe } from "remix/test";
import { expect } from "remix/assert";
import { http, HttpResponse } from "msw/http";
import { server as requestMocks } from "#/test/server.ts";
import { createBrowserPage } from "#/test/e2e.ts";
import { getDb } from "#/app/db/client.ts";
import { drinks, users } from "#/app/db/schema.ts";
import { TEST_ADMIN_USER } from "#/test/database.ts";
import { EDITOR_RESPONSE_MEDIA_TYPE } from "#/app/web/admin-drink-write/public/editor-response.ts";

test("editor redirects require an explicit acceptable editor media type", async (testContext) => {
  const page = await createBrowserPage(testContext);
  for (const { accept, enhanced } of [
    { accept: `${EDITOR_RESPONSE_MEDIA_TYPE};q=0.8, text/html;q=0.5`, enhanced: true },
    { accept: `${EDITOR_RESPONSE_MEDIA_TYPE};q=1`, enhanced: true },
    { accept: `${EDITOR_RESPONSE_MEDIA_TYPE};q=0, */*`, enhanced: false },
    { accept: "text/html, */*;q=0.8", enhanced: false },
    { accept: "application/*", enhanced: false },
  ]) {
    const response = await page.request.post("/%61dmin/drinks/test-margarita/%65dit", {
      headers: { Accept: accept },
      maxRedirects: 0,
    });
    expect(response.status()).toBe(enhanced ? 200 : 302);
    expect(response.headers()["cache-control"]).toBe("private, no-store");
    if (enhanced) {
      expect(await response.json()).toEqual({
        kind: "navigate",
        location: "/login",
        document: true,
      });
    } else {
      expect(response.headers().location).toBe("/login");
    }
  }
});

for (const actor of ["anonymous", "user"]) {
  test(`${actor} cannot read or write ordinary or encoded admin URLs`, async (testContext) => {
    const page = await createBrowserPage(testContext, { admin: actor === "user" });
    if (actor === "user") await getDb().update(users, TEST_ADMIN_USER.id, { role: "user" });
    const destination = actor === "anonymous" ? "/login" : "/unauthorized";
    for (const path of [
      "/admin/drinks",
      "/%61dmin",
      "/%61dmin/",
      "/ad%6Din/drinks",
      "/%61dmin/%64rinks/%6Eew",
      "/%61dmin/drinks/test-margarita/%65dit",
      "/%61dmin/drinks/test-margarita/delete",
    ]) {
      const response = await page.request.get(path, { maxRedirects: 0 });
      expect(response.status()).toBe(302);
      expect(response.headers().location).toBe(
        actor === "anonymous" ? `/login?${new URLSearchParams({ returnTo: path })}` : destination,
      );
      expect(response.headers()["cache-control"]).toBe("private, no-store");
    }
    for (const path of [
      "/admin/drinks/test-margarita/delete",
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
    expect(response.headers().location).toBe("/login?returnTo=%2Fadmin%2Fdrinks");
  });

  test("Google sign-in follows only same-origin Return-to URLs", async (testContext) => {
    const page = await createBrowserPage(testContext);
    // Cookie session storage warns when sign-in regenerates the session ID.
    const logWarning = testContext.mock.method(console, "warn", () => {});
    requestMocks.use(
      http.post("https://oauth2.googleapis.com/token", () =>
        HttpResponse.json({ access_token: "test-access-token", token_type: "Bearer" }),
      ),
      http.get("https://openidconnect.googleapis.com/v1/userinfo", () =>
        HttpResponse.json({
          sub: "test-google-admin",
          email: TEST_ADMIN_USER.email,
          email_verified: true,
          name: TEST_ADMIN_USER.name,
        }),
      ),
    );
    async function signIn(loginPath: string) {
      const login = await page.request.get(loginPath, { maxRedirects: 0 });
      const state = new URL(login.headers().location).searchParams.get("state");
      if (!state) throw new Error("Google authorization URL is missing state");
      const callback = await page.request.get(
        `/auth/google/callback?${new URLSearchParams({ code: "test-code", state })}`,
        { maxRedirects: 0 },
      );
      expect(callback.status()).toBe(302);
      return callback.headers().location;
    }

    const adminVisit = await page.request.get("/admin/drinks?q=sour", { maxRedirects: 0 });
    const loginPath = adminVisit.headers().location;
    expect(loginPath).toBe("/login?returnTo=%2Fadmin%2Fdrinks%3Fq%3Dsour");
    expect(await signIn(loginPath)).toBe("/admin/drinks?q=sour");
    for (const returnTo of ["https://evil.example", "//evil.example", "/\\evil.example"]) {
      expect(await signIn(`/login?${new URLSearchParams({ returnTo })}`)).toBe("/");
    }
    for (const call of logWarning.mock.calls) {
      expect(String(call.arguments[0])).toContain("was regenerated");
    }
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

test("admin submissions reject cross-origin and cross-site browser provenance", async (testContext) => {
  const pageAsAdmin = await createBrowserPage(testContext, { admin: true });
  const provenanceHeaders: Record<string, string>[] = [
    { Origin: "https://another.example" },
    { "Sec-Fetch-Site": "cross-site" },
  ];
  for (const headers of provenanceHeaders) {
    const response = await pageAsAdmin.request.post("/admin/drinks/test-margarita/delete", {
      headers,
      maxRedirects: 0,
    });
    expect(response.status()).toBe(403);
  }
  const drink = await pageAsAdmin.request.get("/test-margarita");
  expect(drink.status()).toBe(200);
});
