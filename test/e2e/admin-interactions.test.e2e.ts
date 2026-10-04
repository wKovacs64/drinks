import { test } from "remix/test";
import { expect } from "remix/assert";
import { createBrowserPage } from "#/test/e2e.ts";

test("admin filter searches tags and Escape restores the list", async (testContext) => {
  const pageAsAdmin = await createBrowserPage(testContext, { admin: true });
  await pageAsAdmin.goto("/admin/drinks");
  await pageAsAdmin.waitForFunction(() => document.documentElement.dataset.remixReady === "true");
  const filter = pageAsAdmin.getByRole("textbox", { name: "Filter drinks" });
  await filter.fill("citrus");
  expect(await pageAsAdmin.locator("tbody tr").count()).toBe(2);
  expect(
    await pageAsAdmin.getByRole("cell", { name: "Test Old Fashioned", exact: true }).count(),
  ).toBe(0);
  await filter.press("Escape");
  expect(await filter.inputValue()).toBe("");
  expect(await pageAsAdmin.locator("tbody tr").count()).toBe(3);
});

test("sorting cycles ascending, descending, and the original order", async (testContext) => {
  const pageAsAdmin = await createBrowserPage(testContext, { admin: true });
  await pageAsAdmin.goto("/admin/drinks");
  await pageAsAdmin.waitForFunction(() => document.documentElement.dataset.remixReady === "true");
  const titles = pageAsAdmin.locator("tbody tr td:first-child");
  const initialOrder = await titles.allTextContents();
  const sort = pageAsAdmin.getByRole("button", { name: "Calories" });
  await sort.click();
  await titles.first().waitFor();
  expect(await titles.first().innerText()).toContain("Test Mojito");
  await sort.click();
  await titles.first().waitFor();
  expect(await titles.first().innerText()).toContain("Test Margarita");
  await sort.click();
  expect(await titles.allTextContents()).toEqual(initialOrder);
});

test("automatic slug stops changing after a manual edit", async (testContext) => {
  const pageAsAdmin = await createBrowserPage(testContext, { admin: true });
  await pageAsAdmin.goto("/admin/drinks/new");
  await pageAsAdmin.waitForFunction(() => document.documentElement.dataset.remixReady === "true");
  await pageAsAdmin.getByLabel("Title", { exact: true }).fill("Café & Whiskey Sour");
  expect(await pageAsAdmin.getByLabel("Slug", { exact: true }).inputValue()).toBe(
    "cafe-and-whiskey-sour",
  );
  await pageAsAdmin.getByLabel("Slug", { exact: true }).fill("my-sour");
  await pageAsAdmin.getByLabel("Title", { exact: true }).fill("Another Name");
  expect(await pageAsAdmin.getByLabel("Slug", { exact: true }).inputValue()).toBe("my-sour");
  await pageAsAdmin.getByRole("button", { name: "Unpublished", exact: true }).click();
  expect(await pageAsAdmin.locator('input[name="status"]').inputValue()).toBe("unpublished");
});

test("duplicate slug preserves edits and displays validation", async (testContext) => {
  const pageAsAdmin = await createBrowserPage(testContext, { admin: true });
  await pageAsAdmin.goto("/admin/drinks/test-margarita/edit");
  await pageAsAdmin.waitForFunction(() => document.documentElement.dataset.remixReady === "true");
  await pageAsAdmin.getByLabel("Title", { exact: true }).fill("Edited Margarita");
  await pageAsAdmin.getByLabel("Slug", { exact: true }).fill("test-mojito");
  await pageAsAdmin.getByRole("button", { name: "Update Drink" }).click();
  await pageAsAdmin.getByRole("alert").waitFor();
  expect(await pageAsAdmin.getByRole("alert").innerText()).toContain("Slug already exists");
  expect(await pageAsAdmin.getByLabel("Title", { exact: true }).inputValue()).toBe(
    "Edited Margarita",
  );
  expect(await pageAsAdmin.getByLabel("Slug", { exact: true }).inputValue()).toBe("test-mojito");
  await pageAsAdmin.waitForURL("/admin/drinks/test-margarita/edit");
});

test("deleting a missing drink returns 404", async (testContext) => {
  const pageAsAdmin = await createBrowserPage(testContext, { admin: true });
  const response = await pageAsAdmin.request.post("/admin/drinks/missing/delete");
  expect(response.status()).toBe(404);
});

test("leaving the editor cancels its pending submission", async (testContext) => {
  const pageAsAdmin = await createBrowserPage(testContext, { admin: true });
  await pageAsAdmin.goto("/admin/drinks/test-margarita/edit");
  await pageAsAdmin.waitForFunction(() => document.documentElement.dataset.remixReady === "true");
  const submissionStarted = Promise.withResolvers<void>();
  const submissionAborted = Promise.withResolvers<void>();
  await pageAsAdmin.exposeFunction("recordSubmissionState", (state: string) => {
    if (state === "pending") submissionStarted.resolve();
    if (state === "aborted") submissionAborted.resolve();
  });
  await pageAsAdmin.evaluate(() => {
    const nativeFetch = window.fetch;
    window.fetch = (...arguments_: Parameters<typeof fetch>) => {
      const options = arguments_[1];
      if (options?.method !== "POST" || !(options.body instanceof FormData))
        return nativeFetch(...arguments_);
      const recordState: unknown = Reflect.get(window, "recordSubmissionState");
      if (typeof recordState === "function") void recordState("pending");
      return new Promise<Response>((_, reject) => {
        options.signal?.addEventListener("abort", () => {
          if (typeof recordState === "function") void recordState("aborted");
          reject(new DOMException("Submission aborted", "AbortError"));
        });
      });
    };
  });
  await pageAsAdmin.getByRole("button", { name: "Update Drink" }).click();
  await submissionStarted.promise;
  await pageAsAdmin.getByRole("link", { name: "admin", exact: true }).click();
  await pageAsAdmin.waitForURL("/admin/drinks");
  await submissionAborted.promise;
  expect(await pageAsAdmin.getByRole("alert").count()).toBe(0);
});

test("image crop supports drawing and keyboard movement and uploads a square JPEG", async (testContext) => {
  const pageAsAdmin = await createBrowserPage(testContext, { admin: true });
  await pageAsAdmin.goto("/admin/drinks/test-margarita/edit");
  await pageAsAdmin.waitForFunction(() => document.documentElement.dataset.remixReady === "true");
  await pageAsAdmin
    .locator('input[type="file"]')
    .setInputFiles("app/assets/images/background-768.jpg");
  const preview = pageAsAdmin.getByAltText("Crop preview");
  await preview.waitFor();
  const selection = pageAsAdmin.locator(".ReactCrop__crop-selection");
  await selection.waitFor();
  const bounds = await preview.boundingBox();
  if (!bounds) throw new Error("Crop image has no bounds");
  await pageAsAdmin.mouse.move(bounds.x + 2, bounds.y + 2);
  await pageAsAdmin.mouse.down();
  await pageAsAdmin.mouse.move(bounds.x + 70, bounds.y + 70, { steps: 4 });
  await pageAsAdmin.mouse.up();
  expect(
    await selection.evaluate(
      (element, propertyName) => getComputedStyle(element).getPropertyValue(propertyName),
      "width",
    ),
  ).toBe("68px");
  await selection.focus();
  await selection.press("ArrowRight");
  expect(
    await selection.evaluate(
      (element, propertyName) => getComputedStyle(element).getPropertyValue(propertyName),
      "left",
    ),
  ).toBe("3px");
  await pageAsAdmin.locator(".ReactCrop__drag-handle.ord-se").focus();
  await pageAsAdmin.locator(".ReactCrop__drag-handle.ord-se").press("ArrowRight");
  expect(
    await selection.evaluate(
      (element, propertyName) => getComputedStyle(element).getPropertyValue(propertyName),
      "width",
    ),
  ).toBe("69px");
  const imageSubmitted = Promise.withResolvers<{ width: number; height: number; type: string }>();
  await pageAsAdmin.exposeFunction(
    "recordCroppedImage",
    (image: { width: number; height: number; type: string }) => {
      imageSubmitted.resolve(image);
    },
  );
  await pageAsAdmin.evaluate(() => {
    const nativeFetch = window.fetch;
    window.fetch = async (...arguments_: Parameters<typeof fetch>) => {
      const body = arguments_[1]?.body;
      const imageFile = body instanceof FormData ? body.get("imageFile") : undefined;
      if (imageFile instanceof File) {
        const image = await createImageBitmap(imageFile);
        const recordImage: unknown = Reflect.get(window, "recordCroppedImage");
        if (typeof recordImage === "function")
          await recordImage({ width: image.width, height: image.height, type: imageFile.type });
        image.close();
      }
      return nativeFetch(...arguments_);
    };
  });
  await pageAsAdmin.getByRole("button", { name: "Update Drink" }).click();
  const capturedImage = await imageSubmitted.promise;
  expect(capturedImage.type).toBe("image/jpeg");
  expect(capturedImage.width).toBeGreaterThan(0);
  expect(capturedImage.width).toBe(capturedImage.height);
  await pageAsAdmin.waitForURL("/admin/drinks");
  await pageAsAdmin.getByRole("status").waitFor();
  expect(await pageAsAdmin.getByRole("status").innerText()).toContain("Drink updated!");
});

test("deletion preserves the active filter and later deletions show a fresh notification", async (testContext) => {
  const pageAsAdmin = await createBrowserPage(testContext, { admin: true });
  await pageAsAdmin.goto("/admin/drinks");
  await pageAsAdmin.waitForFunction(() => document.documentElement.dataset.remixReady === "true");
  const filter = pageAsAdmin.getByRole("textbox", { name: "Filter drinks" });
  await filter.fill("Test M");
  expect(await pageAsAdmin.locator("tbody tr").count()).toBe(2);
  pageAsAdmin.on("dialog", (dialog) => dialog.accept());
  await pageAsAdmin
    .getByRole("row")
    .filter({ has: pageAsAdmin.getByRole("cell", { name: "Test Mojito", exact: true }) })
    .getByRole("button", { name: "Delete" })
    .click();
  expect(await filter.inputValue()).toBe("Test M");
  await pageAsAdmin
    .getByRole("cell", { name: "Test Mojito", exact: true })
    .waitFor({ state: "hidden" });
  expect(await pageAsAdmin.locator("tbody tr").count()).toBe(1);
  await pageAsAdmin.getByRole("status").waitFor();
  await pageAsAdmin.getByRole("status").waitFor({ state: "hidden", timeout: 6000 });
  expect(await pageAsAdmin.getByRole("status").count()).toBe(0);
  await pageAsAdmin
    .getByRole("row")
    .filter({ has: pageAsAdmin.getByRole("cell", { name: "Test Margarita", exact: true }) })
    .getByRole("button", { name: "Delete" })
    .click();
  await pageAsAdmin
    .getByRole("cell", { name: "Test Margarita", exact: true })
    .waitFor({ state: "hidden" });
  expect(await pageAsAdmin.locator("tbody tr").count()).toBe(0);
  await pageAsAdmin.getByRole("status").waitFor();
  expect(await pageAsAdmin.getByRole("status").innerText()).toContain("Drink deleted!");
  await pageAsAdmin.getByRole("status").waitFor();
});
