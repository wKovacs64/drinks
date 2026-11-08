import { test } from "remix/test";
import { expect } from "remix/assert";
import { createBrowserPage } from "#/test/e2e.ts";

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
  expect(await response.text()).toContain("<li>Image must be under 5MB</li>");
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
  expect(await response.text()).toContain("<li>Form submission is too large</li>");
});

test("the editor bounds the number of submitted fields", async (testContext) => {
  const pageAsAdmin = await createBrowserPage(testContext, { admin: true });

  const response = await pageAsAdmin.request.post("/admin/drinks/test-margarita/edit", {
    multipart: Object.fromEntries(Array.from({ length: 17 }, (_, index) => [`field${index}`, "x"])),
  });

  expect(response.status()).toBe(400);
  expect(await response.text()).toContain("<li>Form submission contains too many fields</li>");
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
  expect(await response.text()).toContain("<li>Upload only one image</li>");
});

test("creating a Drink requires an image", async (testContext) => {
  const pageAsAdmin = await createBrowserPage(testContext, { admin: true });

  const response = await pageAsAdmin.request.post("/admin/drinks/new", {
    multipart: { title: "No Image" },
  });

  expect(response.status()).toBe(400);
  expect(await response.text()).toContain("<li>Image is required</li>");
});

test("the editor reports every invalid draft field", async (testContext) => {
  const pageAsAdmin = await createBrowserPage(testContext, { admin: true });

  const response = await pageAsAdmin.request.post("/admin/drinks/test-margarita/edit", {
    multipart: {
      title: " ",
      slug: "Not A Slug",
      ingredients: "2 oz tequila",
      calories: "-1",
      tags: "tequila",
      notes: "",
      rank: "first",
      status: "published",
    },
  });

  expect(response.status()).toBe(400);
  const html = await response.text();

  for (const error of [
    "Title is required",
    "Slug must be lowercase letters, numbers, and hyphens",
    "Calories cannot be negative",
    "Rank must be a whole number",
  ])
    expect(html).toContain(`<li>${error}</li>`);
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
