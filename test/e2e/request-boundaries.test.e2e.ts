import { test } from "remix/test";
import { expect } from "remix/assert";
import { createBrowserPage } from "#/test/e2e.ts";
import { EDITOR_RESPONSE_MEDIA_TYPE } from "#/app/web/admin-drink-write/public/editor-response.ts";

test("the editor preserves its existing per-image size limit", async (testContext) => {
  const pageAsAdmin = await createBrowserPage(testContext, { admin: true });
  const response = await pageAsAdmin.request.post("/admin/drinks/test-margarita/edit", {
    headers: { Accept: EDITOR_RESPONSE_MEDIA_TYPE },
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
    headers: { Accept: EDITOR_RESPONSE_MEDIA_TYPE },
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
    headers: { Accept: EDITOR_RESPONSE_MEDIA_TYPE },
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
    headers: { Accept: EDITOR_RESPONSE_MEDIA_TYPE },
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

test("browser assets expose public source and the route map while keeping server source private", async (testContext) => {
  const page = await createBrowserPage(testContext);
  for (const path of [
    "/assets/app/actions/public/entry.ts",
    "/assets/app/routes.ts",
    "/assets/app/ui/icons/public/icon.tsx",
  ]) {
    const response = await page.request.get(path);
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("javascript");
  }
  for (const path of [
    "/assets/app/actions/document.tsx",
    "/assets/app/ui/core/header.tsx",
    "/assets/app/modules/drinks/drinks.ts",
    "/assets/app/modules/drinks/drinks-contract.ts",
    "/assets/app/modules/drinks/drinks.test.ts",
    "/assets/app/modules/identity/identity.ts",
    "/assets/app/core/env.ts",
    "/assets/app/db/client.ts",
    "/assets/app/integrations/imagekit.ts",
    "/assets/app/web/admin-drink-write/submission.ts",
  ]) {
    const response = await page.request.get(path);
    expect(response.status()).toBe(404);
  }
});
