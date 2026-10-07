import { test } from "remix/test";
import { expect } from "remix/assert";
import { createBrowserPage } from "#/test/e2e.ts";
import { http, HttpResponse } from "msw";
import { server as requestMocks } from "#/test/server.ts";

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
  for (const path of [
    "/missing-drink",
    "/tags/missing-tag",
    "/missing/route",
    "/administrator",
    "/%61dministrator",
  ]) {
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
    "/%61dmin/%64rinks/test-margarita/%65dit",
    "/login",
    "/%6Cogin",
    "/auth/google/callback",
    "/%61uth/google/callback",
    "/login-failed",
    "/unauthorized",
  ]) {
    const response = await page.request.get(path, { maxRedirects: 0 });
    expect(response.headers()["cache-control"]).toBe("private, no-store");
    expect(response.headers()["surrogate-key"]).toBe(undefined);
  }
  for (const path of ["/logout", "/%6Cogout"]) {
    const logoutResponse = await page.request.post(path, { maxRedirects: 0 });
    expect(logoutResponse.status()).toBe(302);
    expect(logoutResponse.headers()["cache-control"]).toBe("private, no-store");
  }
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

for (const failure of ["HTTP", "network"]) {
  test(`a committed rename navigates with a warning after ${failure} purge failure`, async (testContext) => {
    const page = await createBrowserPage(testContext, { admin: true });
    requestMocks.use(
      http.post("https://api.fastly.com/service/:serviceId/purge", () =>
        failure === "HTTP"
          ? new HttpResponse("private cache integration details", { status: 503 })
          : HttpResponse.error(),
      ),
    );
    await page.goto("/admin/drinks/test-margarita/edit");
    await page.waitForFunction(() => document.documentElement.dataset.remixReady === "true");
    await page.getByLabel("Title", { exact: true }).fill("Committed Margarita");
    await page.getByLabel("Slug", { exact: true }).fill("committed-margarita");
    const submission = page.waitForResponse(
      (response) =>
        response.request().method() === "POST" && response.url().endsWith("/test-margarita/edit"),
    );
    await page.getByRole("button", { name: "Update Drink" }).click();
    expect((await submission).status()).toBe(200);
    await page.waitForURL("/admin/drinks");
    await page.getByRole("cell", { name: "Committed Margarita", exact: true }).waitFor();
    const notification = page.getByRole("status");
    await notification.filter({ hasText: "Drink updated, but cache refresh failed" }).waitFor();
    expect(await notification.getAttribute("data-kind")).toBe("warning");
    expect(await notification.innerText()).toBe("Drink updated, but cache refresh failed");
    expect((await page.request.get("/committed-margarita")).status()).toBe(200);
    expect((await page.request.get("/test-margarita")).status()).toBe(404);
  });
}
