import { test } from "remix/test";
import { expect } from "remix/assert";
import { createBrowserPage } from "#/test/e2e.ts";
import { http, HttpResponse } from "msw";
import { server as requestMocks } from "#/test/server.ts";

test("admin login redirects cannot be cached", async (testContext) => {
  const page = await createBrowserPage(testContext);
  const response = await page.request.get("/admin/drinks", { maxRedirects: 0 });
  expect(response.status()).toBe(302);
  expect(response.headers().location).toBe("/login");
  expect(response.headers()["cache-control"]).toBe("private, no-store");
});

test("public pages retain their original cache lifetimes and Fastly keys", async (testContext) => {
  const page = await createBrowserPage(testContext, { admin: true });
  const cases = [
    ["/", "all index"],
    ["/search", "all"],
    ["/search?q=tequila", "search all"],
    ["/tags", "all tags bourbon citrus classic mint rum tequila"],
    ["/tags/citrus", "all tags citrus"],
    ["/test-margarita", "all test-margarita"],
  ];
  for (const [path, surrogateKeys] of cases) {
    const response = await page.request.get(path);
    expect(response.status()).toBe(200);
    expect(response.headers()["cache-control"]).toBe(
      "public, max-age=30, s-maxage=31536000, stale-while-revalidate=600, stale-if-error=86400",
    );
    expect(response.headers()["surrogate-key"]).toBe(surrogateKeys);
    expect(response.headers()["set-cookie"]).toBe(undefined);
  }
});

test("missing drinks, tags, and routes retain short-lived caching", async (testContext) => {
  const page = await createBrowserPage(testContext);
  for (const path of ["/missing-drink", "/tags/missing-tag", "/missing/route"]) {
    const response = await page.request.get(path);
    expect(response.status()).toBe(404);
    expect(response.headers()["cache-control"]).toBe(
      "public, max-age=30, s-maxage=60, must-revalidate",
    );
    expect(response.headers()["surrogate-key"]).toBe("all");
  }
});

test("admin pages and authentication responses cannot be cached", async (testContext) => {
  const page = await createBrowserPage(testContext, { admin: true });
  for (const path of [
    "/admin",
    "/admin/drinks",
    "/admin/drinks/new",
    "/admin/drinks/test-margarita/edit",
    "/admin/drinks/missing/edit",
    "/login",
    "/auth/google/callback",
  ]) {
    const response = await page.request.get(path, { maxRedirects: 0 });
    expect(response.headers()["cache-control"]).toBe("private, no-store");
    expect(response.headers()["surrogate-key"]).toBe(undefined);
  }
  const logoutResponse = await page.request.post("/logout", { maxRedirects: 0 });
  expect(logoutResponse.status()).toBe(302);
  expect(logoutResponse.headers()["cache-control"]).toBe("private, no-store");
});

test("editing a drink purges the existing public route cache keys", async (testContext) => {
  const page = await createBrowserPage(testContext, { admin: true });
  const purgedKeys: string[] = [];
  requestMocks.use(
    http.post("https://api.fastly.com/service/test-fastly-service-id/purge", ({ request }) => {
      purgedKeys.push(request.headers.get("Surrogate-Key") ?? "");
      return HttpResponse.json({ status: "ok" });
    }),
  );
  const response = await page.request.post("/admin/drinks/test-margarita/edit", {
    multipart: {
      title: "Renamed Margarita",
      slug: "renamed-margarita",
      ingredients: "2 oz tequila",
      calories: "200",
      tags: "tequila, bright citrus",
      notes: "",
      rank: "10",
      status: "unpublished",
    },
    maxRedirects: 0,
  });
  expect(response.status()).toBe(303);
  expect(response.headers()["cache-control"]).toBe("private, no-store");
  expect(purgedKeys).toEqual([
    "index search test-margarita renamed-margarita tags tequila citrus bright_citrus",
  ]);

  const privateDrink = await page.request.get("/renamed-margarita");
  expect(privateDrink.status()).toBe(200);
  expect(privateDrink.headers()["cache-control"]).toBe("private, no-store");
  expect(privateDrink.headers()["surrogate-key"]).toBe(undefined);

  await page.context().clearCookies();
  const hiddenDrink = await page.request.get("/renamed-margarita");
  expect(hiddenDrink.status()).toBe(404);
});
