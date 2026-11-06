import { test } from "remix/test";
import { expect } from "remix/assert";
import { rawSql } from "remix/data-table";
import { getDb } from "#/app/db/client.ts";
import { createBrowserPage } from "#/test/e2e.ts";

function contentSecurityPolicy(nonce: string) {
  return `base-uri 'none'; frame-ancestors 'none'; form-action 'self'; default-src 'self'; connect-src 'self' https://ik.imagekit.io/; img-src 'self' data: blob: https:; script-src 'self' 'nonce-${nonce}'; style-src 'self' 'unsafe-inline'`;
}

function expectSecurityHeaders(headers: Record<string, string>) {
  expect(headers["x-content-type-options"]).toBe("nosniff");
  expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  expect(headers["x-frame-options"]).toBe("DENY");
  expect(headers["permissions-policy"]).toBe(
    "geolocation=(), camera=(), microphone=(), payment=(), usb=()",
  );
  const nonce = /'nonce-([^']+)'/.exec(headers["content-security-policy"] ?? "")?.[1] ?? "";
  expect(headers["content-security-policy"]).toBe(contentSecurityPolicy(nonce));
  return nonce;
}

test("public, not-found, and signed-out responses carry security headers", async (testContext) => {
  const page = await createBrowserPage(testContext);
  const cases = [
    { path: "/", status: 200 },
    { path: "/test-margarita", status: 200 },
    { path: "/tags/citrus", status: 200 },
    { path: "/search", status: 200 },
    { path: "/missing/route", status: 404 },
    { path: "/admin/drinks", status: 302, private: true },
    { path: "/login", status: 302, private: true },
  ];
  for (const { path, status, private: isPrivate } of cases) {
    const response = await page.request.get(path, { maxRedirects: 0 });
    expect(response.status()).toBe(status);
    expectSecurityHeaders(response.headers());
    if (isPrivate) expect(response.headers()["cache-control"]).toBe("private, no-store");
  }
});

test("documents nonce their scripts with a fresh value per response", async (testContext) => {
  const page = await createBrowserPage(testContext);
  const nonces = new Set<string>();
  for (let index = 0; index < 2; index++) {
    const response = await page.request.get("/");
    const nonce = expectSecurityHeaders(response.headers());
    const html = await response.text();
    expect(html).toContain(`type="importmap" nonce="${nonce}"`);
    expect(html.match(/<script\b[^>]*>/g)?.every((tag) => tag.includes(`nonce="${nonce}"`))).toBe(
      true,
    );
    nonces.add(nonce);
  }
  expect(nonces.size).toBe(2);
});

test("signed-in admin pages carry security headers", async (testContext) => {
  const page = await createBrowserPage(testContext, { admin: true });
  const response = await page.request.get("/admin/drinks");
  expect(response.status()).toBe(200);
  expectSecurityHeaders(response.headers());
  expect(response.headers()["cache-control"]).toBe("private, no-store");
});

test("route failure pages carry security headers", async (testContext) => {
  const page = await createBrowserPage(testContext);
  const logError = testContext.mock.method(console, "error", () => {});
  await getDb().exec(
    rawSql("UPDATE drinks SET ingredients = 'invalid-json' WHERE slug = 'test-margarita'"),
  );
  const response = await page.request.get("/test-margarita");
  expect(response.status()).toBe(500);
  expectSecurityHeaders(response.headers());
  expect(logError.mock.calls[0]?.arguments[0]).toBe("Route failed");
});
