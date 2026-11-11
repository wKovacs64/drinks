import { test, describe } from "remix/test";
import { expect } from "remix/assert";
import { captureLoggedErrorLabels, createBrowserPage } from "#/test/e2e.ts";
import { http, HttpResponse } from "msw/http";
import { server as requestMocks } from "#/test/server.ts";

describe("Create New Drink", () => {
  test("can create a new drink with a warning after HTTP purge failure", async (testContext) => {
    const loggedErrorLabels = captureLoggedErrorLabels(testContext);
    const pageAsAdmin = await createBrowserPage(testContext, { admin: true });
    requestMocks.use(
      http.post(
        "https://api.fastly.com/service/:serviceId/purge",
        () => new HttpResponse("private cache integration details", { status: 503 }),
      ),
    );
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
    const notification = pageAsAdmin.getByRole("status");
    await notification.filter({ hasText: "Drink created, but cache refresh failed" }).waitFor();
    expect(await notification.getAttribute("data-kind")).toBe("warning");
    expect(await notification.innerText()).toBe("Drink created, but cache refresh failed");
    expect(loggedErrorLabels()).toEqual(["Failed to refresh cache after committed write:"]);
  });
});

test("create retries preserve the draft and crop, and each save uploads the current crop", async (testContext) => {
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
  await page.getByRole("radio", { name: "Unpublished", exact: true }).check();
  await page.locator('input[type="file"]').setInputFiles("app/assets/images/background-768.jpg");

  const selection = page.getByRole("group", {
    name: "Use the arrow keys to move the crop selection area",
  });

  await selection.waitFor();

  const cropHandle = page.getByRole("button", {
    name: "Use the arrow keys to move the south east drag handle to change the crop selection area",
  });

  await cropHandle.focus();
  await cropHandle.press("Shift+ArrowLeft");
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

        // SAFETY: page.exposeFunction above installs recordUploadedImage on window.
        const { recordUploadedImage } = window as Window & {
          recordUploadedImage?: (summary: string) => Promise<void>;
        };

        await recordUploadedImage?.(
          `${imageFile.name} ${imageFile.type} ${Array.from(new Uint8Array(digest)).join(",")}`,
        );
      }

      return nativeFetch(...arguments_);
    };
  });
  await page.getByRole("button", { name: "Create Drink" }).click();
  await page.getByRole("alert").filter({ hasText: "Slug already exists" }).waitFor();
  expect(await page.getByText("Select the image again before saving.").count()).toBe(0);
  expect(await page.getByLabel("Title", { exact: true }).inputValue()).toBe("Retry With Image");
  expect(await page.getByLabel("Ingredients (one per line)").inputValue()).toBe(
    "1 oz gin\n2 oz tonic",
  );
  expect(await page.getByLabel("Calories").inputValue()).toBe("123");
  expect(await page.getByLabel("Tags (comma-separated)").inputValue()).toBe("gin, citrus");
  expect(await page.getByLabel("Notes (markdown)").inputValue()).toBe("Keep these notes");
  expect(await page.getByLabel("Rank").inputValue()).toBe("7");
  expect(await page.locator('input[name="status"]:checked').inputValue()).toBe("unpublished");
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

  await cropHandle.press("Shift+ArrowLeft");
  // Hold the crop's encoding so the save is observably waiting on it.
  await page.evaluate(() => {
    const nativeToBlob = HTMLCanvasElement.prototype.toBlob;
    const cropRelease: PromiseWithResolvers<void> = Promise.withResolvers();
    Reflect.set(window, "releaseCrop", cropRelease.resolve);
    HTMLCanvasElement.prototype.toBlob = function (
      this: HTMLCanvasElement,
      ...arguments_: Parameters<HTMLCanvasElement["toBlob"]>
    ) {
      void cropRelease.promise.then(() => nativeToBlob.apply(this, arguments_));
    };
  });
  const submissions: string[] = [];
  page.on("request", (request) => {
    if (request.method() === "POST") submissions.push(request.url());
  });
  await page.getByRole("button", { name: "Create Drink" }).click();
  await page.getByRole("button", { name: "Saving..." }).waitFor();
  expect(submissions).toEqual([]);
  // A field invalidated while the crop encodes cancels the save and re-enables it.
  await page.getByLabel("Title", { exact: true }).fill("");
  await page.evaluate(() => {
    // SAFETY: the evaluate that holds the crop's encoding sets window.releaseCrop to a resolver.
    const { releaseCrop } = window as Window & { releaseCrop?: () => void };
    releaseCrop?.();
  });
  await page.getByRole("button", { name: "Create Drink" }).waitFor();
  expect(await page.getByRole("button", { name: "Create Drink" }).isEnabled()).toBe(true);
  expect(
    await page.getByLabel("Title", { exact: true }).evaluate((input) => input.matches(":invalid")),
  ).toBe(true);
  expect(submissions).toEqual([]);
  await page.getByLabel("Title", { exact: true }).fill("Retry With Image");
  await page.getByRole("button", { name: "Create Drink" }).click();
  await page.waitForURL("/admin/drinks");
  await page.getByRole("cell", { name: "Retry With Image" }).waitFor();
  expect(submissions.length).toBe(1);
  expect(uploadedImages.length).toBe(3);

  for (const image of uploadedImages)
    expect(image.startsWith("cropped.jpg image/jpeg ")).toBe(true);
  expect(uploadedImages[1]).toBe(uploadedImages[0]);
  expect(uploadedImages[2]).not.toBe(uploadedImages[1]);
  await page.getByRole("status").filter({ hasText: "Drink created!" }).waitFor();
});

test("creating without an image asks for one without sending the form", async (testContext) => {
  const page = await createBrowserPage(testContext, { admin: true });
  await page.goto("/admin/drinks/new");
  await page.waitForFunction(() => document.documentElement.dataset.remixReady === "true");
  await page.getByLabel("Title", { exact: true }).fill("Imageless");
  await page.getByLabel("Ingredients (one per line)").fill("1 oz gin");
  await page.getByLabel("Calories").fill("100");
  await page.getByLabel("Tags (comma-separated)").fill("gin");
  let posted = false;
  page.on("request", (request) => {
    if (request.method() === "POST") posted = true;
  });
  const createButton = page.getByRole("button", { name: "Create Drink" });
  await createButton.click();
  await page.getByText("Image is required").waitFor();
  expect(await createButton.isEnabled()).toBe(true);
  expect(posted).toBe(false);
});
