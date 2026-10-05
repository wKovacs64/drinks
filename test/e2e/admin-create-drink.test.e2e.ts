import { test, describe } from "remix/test";
import { expect } from "remix/assert";
import { createBrowserPage } from "#/test/e2e.ts";

describe("Create New Drink", () => {
  test("can create a new drink", async (testContext) => {
    const pageAsAdmin = await createBrowserPage(testContext, { admin: true });
    await pageAsAdmin.goto("/admin/drinks/new");
    await pageAsAdmin.waitForFunction(() => document.documentElement.dataset.remixReady === "true");

    // Should see the form
    await pageAsAdmin.getByRole("heading", { name: "Add New Drink" }).waitFor();

    // Fill out the form
    await pageAsAdmin.getByLabel("Title").fill("New Test Drink");
    await pageAsAdmin.getByLabel("Slug").fill("new-test-drink");
    await pageAsAdmin.getByLabel("Ingredients (one per line)").fill("1 oz vodka\n2 oz juice");
    await pageAsAdmin.getByLabel("Calories").fill("120");
    await pageAsAdmin.getByLabel("Tags (comma-separated)").fill("vodka, juice");
    await pageAsAdmin.getByLabel("Notes (markdown)").fill("A test drink");
    await pageAsAdmin.getByLabel("Rank").fill("5");

    // Upload a test image so the form passes client-side validation
    const testImageBuffer = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFklEQVQYV2P8/5+hnoEIwDiqEF8oAABkvQMRzBOz/QAAAABJRU5ErkJggg==",
      "base64",
    );
    await pageAsAdmin.locator('input[type="file"]').setInputFiles({
      name: "test.png",
      mimeType: "image/png",
      buffer: testImageBuffer,
    });
    await pageAsAdmin.getByAltText("Crop preview").waitFor();

    // Submit the form
    await pageAsAdmin.getByRole("button", { name: "Create Drink" }).click();

    // Should redirect to drinks list
    await pageAsAdmin.waitForURL("/admin/drinks");

    // New drink should appear in list
    await pageAsAdmin.getByRole("cell", { name: "New Test Drink" }).waitFor();
  });
});

test("create retries preserve text, selected image, and crop after validation and network failure", async (testContext) => {
  const page = await createBrowserPage(testContext, { admin: true });
  await page.goto("/admin/drinks/new");
  await page.waitForFunction(() => document.documentElement.dataset.remixReady === "true");
  await page.getByLabel("Title", { exact: true }).fill("Retry With Image");
  await page.getByLabel("Slug", { exact: true }).fill("test-mojito");
  await page.getByLabel("Ingredients (one per line)").fill("1 oz gin\n2 oz tonic");
  await page.getByLabel("Calories").fill("123");
  await page.getByLabel("Tags (comma-separated)").fill("gin, citrus");
  await page.getByLabel("Notes (markdown)").fill("Keep these notes");
  await page.getByLabel("Rank").fill("7");
  await page.getByRole("button", { name: "Unpublished", exact: true }).click();
  await page.locator('input[type="file"]').setInputFiles("app/assets/images/background-768.jpg");
  const selection = page.locator(".ReactCrop__crop-selection");
  await selection.waitFor();
  await page.locator(".ReactCrop__drag-handle.ord-se").focus();
  await page.locator(".ReactCrop__drag-handle.ord-se").press("Shift+ArrowLeft");
  await page.getByLabel("Notes (markdown)").focus();
  const cropStyle = await selection.getAttribute("style");
  const previewSource = await page.getByAltText("Crop preview").getAttribute("src");
  const uploadedImages: string[] = [];
  await page.exposeFunction("recordUploadedImage", (digest: string) => uploadedImages.push(digest));
  await page.evaluate(() => {
    const nativeFetch = window.fetch;
    window.fetch = async (...arguments_: Parameters<typeof fetch>) => {
      const body = arguments_[1]?.body;
      const imageFile = body instanceof FormData ? body.get("imageFile") : undefined;
      if (imageFile instanceof File) {
        const digest = await crypto.subtle.digest("SHA-256", await imageFile.arrayBuffer());
        const recordImage: unknown = Reflect.get(window, "recordUploadedImage");
        if (typeof recordImage === "function")
          await recordImage(Array.from(new Uint8Array(digest)).join(","));
      }
      return nativeFetch(...arguments_);
    };
  });
  await page.getByRole("button", { name: "Create Drink" }).click();
  await page.getByRole("alert").filter({ hasText: "Slug already exists" }).waitFor();
  expect(await page.getByLabel("Title", { exact: true }).inputValue()).toBe("Retry With Image");
  expect(await page.getByLabel("Ingredients (one per line)").inputValue()).toBe(
    "1 oz gin\n2 oz tonic",
  );
  expect(await page.getByLabel("Calories").inputValue()).toBe("123");
  expect(await page.getByLabel("Tags (comma-separated)").inputValue()).toBe("gin, citrus");
  expect(await page.getByLabel("Notes (markdown)").inputValue()).toBe("Keep these notes");
  expect(await page.getByLabel("Rank").inputValue()).toBe("7");
  expect(await page.locator('input[name="status"]').inputValue()).toBe("unpublished");
  expect(await selection.getAttribute("style")).toBe(cropStyle);
  expect(await page.getByAltText("Crop preview").getAttribute("src")).toBe(previewSource);

  await page.getByLabel("Slug", { exact: true }).fill("retry-with-image");
  await page.route("**/admin/drinks/new", (route) => route.abort("failed"));
  await page.getByRole("button", { name: "Create Drink" }).click();
  await page.getByRole("alert").filter({ hasText: "Please try again" }).waitFor();
  expect(await page.getByLabel("Notes (markdown)").inputValue()).toBe("Keep these notes");
  expect(await selection.getAttribute("style")).toBe(cropStyle);
  expect(await page.getByAltText("Crop preview").getAttribute("src")).toBe(previewSource);
  await page.unroute("**/admin/drinks/new");
  await page.getByRole("button", { name: "Create Drink" }).click();
  await page.waitForURL("/admin/drinks");
  await page.getByRole("cell", { name: "Retry With Image" }).waitFor();
  expect(uploadedImages.length).toBe(3);
  expect(new Set(uploadedImages).size).toBe(1);
  await page.getByRole("status").filter({ hasText: "Drink created!" }).waitFor();
});
