import { test } from "remix/test";
import { expect } from "remix/assert";
import { createBrowserPage } from "#/test/e2e.ts";

test("admin mutations reject cross-site browser provenance even without Origin", async (testContext) => {
  const pageAsAdmin = await createBrowserPage(testContext, { admin: true });
  const response = await pageAsAdmin.request.post("/admin/drinks/missing/delete", {
    headers: { "Sec-Fetch-Site": "cross-site" },
  });
  expect(response.status()).toBe(403);
});

test("the editor preserves its existing per-image size limit", async (testContext) => {
  const pageAsAdmin = await createBrowserPage(testContext, { admin: true });
  const response = await pageAsAdmin.request.post("/admin/drinks/test-margarita/edit", {
    multipart: {
      imageFile: {
        name: "large.jpg",
        mimeType: "image/jpeg",
        buffer: Buffer.alloc(5 * 1024 * 1024 + 1),
      },
    },
  });
  expect(response.status()).toBe(400);
  expect(await response.json()).toMatchObject({
    fieldErrors: { imageFile: ["Image must be under 5MB"] },
  });
});

test("the editor bounds the complete multipart submission", async (testContext) => {
  const pageAsAdmin = await createBrowserPage(testContext, { admin: true });
  const response = await pageAsAdmin.request.post("/admin/drinks/test-margarita/edit", {
    multipart: {
      title: "x".repeat(2 * 1024 * 1024),
      notes: "x".repeat(2 * 1024 * 1024),
      ingredients: "x".repeat(2 * 1024 * 1024),
    },
  });
  expect(response.status()).toBe(400);
  expect(await response.json()).toMatchObject({
    fieldErrors: { imageFile: ["Form submission is too large"] },
  });
});

test("the editor bounds the number of submitted fields", async (testContext) => {
  const pageAsAdmin = await createBrowserPage(testContext, { admin: true });
  const response = await pageAsAdmin.request.post("/admin/drinks/test-margarita/edit", {
    multipart: Object.fromEntries(Array.from({ length: 17 }, (_, index) => [`field${index}`, "x"])),
  });
  expect(response.status()).toBe(400);
  expect(await response.json()).toMatchObject({
    fieldErrors: { imageFile: ["Form submission contains too many fields"] },
  });
});

test("the single-image editor rejects an additional uploaded file", async (testContext) => {
  const pageAsAdmin = await createBrowserPage(testContext, { admin: true });
  const response = await pageAsAdmin.request.post("/admin/drinks/test-margarita/edit", {
    multipart: {
      title: "Test Margarita",
      slug: "test-margarita",
      ingredients: "2 oz tequila",
      calories: "200",
      tags: "tequila",
      notes: "",
      rank: "0",
      status: "published",
      imageFile: { name: "first.jpg", mimeType: "image/jpeg", buffer: Buffer.from("image") },
      extraFile: { name: "second.jpg", mimeType: "image/jpeg", buffer: Buffer.from("image") },
    },
    maxRedirects: 0,
  });
  expect(response.status()).toBe(400);
  expect(await response.json()).toMatchObject({
    fieldErrors: { imageFile: ["Upload only one image"] },
  });
});
