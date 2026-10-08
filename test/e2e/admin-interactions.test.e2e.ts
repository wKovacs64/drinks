import { test } from "remix/test";
import { expect } from "remix/assert";
import { createBrowserPage } from "#/test/e2e.ts";
import { getDb } from "#/app/db/client.ts";
import { drinks } from "#/app/db/schema.ts";

test("deletion follows the native redirect and retains sorting and filtering", async (testContext) => {
  const page = await createBrowserPage(testContext, { admin: true });
  await page.goto("/admin/drinks");
  await page.waitForFunction(() => document.documentElement.dataset.remixReady === "true");
  await page.clock.install();
  await page.getByRole("textbox", { name: "Filter drinks" }).fill("Test");
  await page.getByRole("button", { name: "Calories", exact: true }).click();
  await page.waitForFunction(() =>
    document.querySelector("tbody tr")?.textContent?.includes("Test Mojito"),
  );
  page.on("dialog", (dialog) => dialog.accept());
  const deletionResponsePromise = page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === "/admin/drinks/test-old-fashioned/delete" &&
      response.request().method() === "POST",
  );
  const listResponsePromise = page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === "/admin/drinks" &&
      response.request().method() === "GET" &&
      response.request().headers()["x-remix-target"] !== "admin-drinks",
  );
  await page
    .getByRole("row")
    .filter({ hasText: "Test Old Fashioned" })
    .getByRole("button", { name: "Delete" })
    .click();
  const deletionResponse = await deletionResponsePromise;
  expect(deletionResponse.status()).toBe(303);
  expect(deletionResponse.headers().location).toBe("/admin/drinks");
  const listResponse = await listResponsePromise;
  expect(listResponse.status()).toBe(200);
  await page.getByRole("status").filter({ hasText: "Drink deleted!" }).waitFor();
  expect(await page.getByRole("textbox", { name: "Filter drinks" }).inputValue()).toBe("Test");
  expect(await page.locator("tbody tr td:first-child").allTextContents()).toEqual([
    "Test Mojito",
    "Test Margarita",
  ]);
  await page.getByRole("textbox", { name: "Filter drinks" }).fill("Test M");
  await page.clock.runFor(4500);
  await page.getByRole("status").waitFor({ state: "hidden" });
  await page
    .getByRole("row")
    .filter({ hasText: "Test Mojito" })
    .getByRole("button", { name: "Delete" })
    .click();
  await page.getByRole("cell", { name: "Test Mojito", exact: true }).waitFor({ state: "hidden" });
  await page.getByRole("status").filter({ hasText: "Drink deleted!" }).waitFor();
  expect(await page.getByRole("textbox", { name: "Filter drinks" }).inputValue()).toBe("Test M");
  expect(await page.locator("tbody tr td:first-child").allTextContents()).toEqual([
    "Test Margarita",
  ]);
});

test("admin filter excludes recipe fields and timestamps and Escape restores the list", async (testContext) => {
  const pageAsAdmin = await createBrowserPage(testContext, { admin: true });
  await getDb().updateMany(drinks, { created_at: 1735776000 }, { where: { slug: "test-mojito" } });
  await pageAsAdmin.goto("/admin/drinks");
  await pageAsAdmin.waitForFunction(() => document.documentElement.dataset.remixReady === "true");
  const filter = pageAsAdmin.getByRole("textbox", { name: "Filter drinks" });
  for (const excludedValue of ["citrus", "2025-01-02"]) {
    await filter.fill("Test");
    await pageAsAdmin.waitForFunction(() => document.querySelectorAll("tbody tr").length === 3);
    await filter.fill(excludedValue);
    await pageAsAdmin.waitForFunction(
      () => document.querySelectorAll("tbody tr").length === 0,
      undefined,
      { timeout: 2000 },
    );
    expect(await pageAsAdmin.locator("tbody tr").count()).toBe(0);
  }
  await filter.fill("MARGARITA");
  await pageAsAdmin.waitForFunction(() => document.querySelectorAll("tbody tr").length === 1);
  expect(await pageAsAdmin.locator("tbody tr td:first-child").allTextContents()).toEqual([
    "Test Margarita",
  ]);
  await filter.press("Escape");
  await pageAsAdmin.waitForFunction(() => {
    const filterInput = document.querySelector('input[aria-label="Filter drinks"]');
    return (
      filterInput instanceof HTMLInputElement &&
      filterInput.value === "" &&
      document.querySelectorAll("tbody tr").length === 3
    );
  });
  expect(await filter.inputValue()).toBe("");
  expect(await pageAsAdmin.locator("tbody tr").count()).toBe(3);
});

test("sorting cycles ascending, descending, and the original order", async (testContext) => {
  const pageAsAdmin = await createBrowserPage(testContext, { admin: true });
  await pageAsAdmin.goto("/admin/drinks");
  await pageAsAdmin.waitForFunction(() => document.documentElement.dataset.remixReady === "true");
  const titles = pageAsAdmin.locator("tbody tr td:first-child");
  const initialOrder = await titles.allTextContents();
  const waitForTitleOrder = (expectedTitles: string[]) =>
    pageAsAdmin.waitForFunction((expectedOrder) => {
      const actualTitles = Array.from(
        document.querySelectorAll("tbody tr td:first-child"),
        (cell) => cell.textContent,
      );
      return (
        actualTitles.length === expectedOrder.length &&
        actualTitles.every((title, index) => title === expectedOrder[index])
      );
    }, expectedTitles);
  const sort = pageAsAdmin.getByRole("button", { name: "Calories" });
  await sort.click();
  await waitForTitleOrder(["Test Mojito", "Test Old Fashioned", "Test Margarita"]);
  expect(await titles.first().innerText()).toContain("Test Mojito");
  await sort.click();
  await waitForTitleOrder(["Test Margarita", "Test Old Fashioned", "Test Mojito"]);
  expect(await titles.first().innerText()).toContain("Test Margarita");
  await sort.click();
  await waitForTitleOrder(initialOrder);
  expect(await titles.allTextContents()).toEqual(initialOrder);
});

test("automatic slug stops changing after a manual edit", async (testContext) => {
  const pageAsAdmin = await createBrowserPage(testContext, { admin: true });
  await pageAsAdmin.goto("/admin/drinks/new");
  await pageAsAdmin.waitForFunction(() => document.documentElement.dataset.remixReady === "true");
  expect(await pageAsAdmin.getByLabel("Title", { exact: true }).inputValue()).toBe("");
  expect(await pageAsAdmin.getByLabel("Calories", { exact: true }).inputValue()).toBe("");
  expect(await pageAsAdmin.getByLabel("Rank", { exact: true }).inputValue()).toBe("0");
  expect(await pageAsAdmin.locator('input[name="status"]:checked').inputValue()).toBe("published");
  expect(await pageAsAdmin.getByRole("button", { name: "Create Drink", exact: true }).count()).toBe(
    1,
  );
  await pageAsAdmin.getByLabel("Title", { exact: true }).fill("Café & Whiskey Sour");
  await pageAsAdmin.waitForFunction(() => {
    const slugInput = document.querySelector('input[name="slug"]');
    return slugInput instanceof HTMLInputElement && slugInput.value === "cafe-and-whiskey-sour";
  });
  expect(await pageAsAdmin.getByLabel("Slug", { exact: true }).inputValue()).toBe(
    "cafe-and-whiskey-sour",
  );
  await pageAsAdmin.getByLabel("Slug", { exact: true }).fill("my-sour");
  await pageAsAdmin.getByLabel("Title", { exact: true }).fill("Another Name");
  expect(await pageAsAdmin.getByLabel("Slug", { exact: true }).inputValue()).toBe("my-sour");
  await pageAsAdmin.getByRole("radio", { name: "Unpublished", exact: true }).check();
  await pageAsAdmin.waitForFunction(() => {
    const statusInput = document.querySelector('input[name="status"]:checked');
    return statusInput instanceof HTMLInputElement && statusInput.value === "unpublished";
  });
  expect(await pageAsAdmin.locator('input[name="status"]:checked').inputValue()).toBe(
    "unpublished",
  );
});

test("deleting a missing drink returns 404", async (testContext) => {
  const pageAsAdmin = await createBrowserPage(testContext, { admin: true });
  const response = await pageAsAdmin.request.post("/admin/drinks/missing/delete");
  expect(response.status()).toBe(404);
  expect(response.headers()["content-type"]).toContain("text/html");
  expect(await response.text()).toContain("404 Not Found");
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

for (const gesture of ["draw", "move", "resize"]) {
  test(`changing the image cancels an active ${gesture} gesture`, async (testContext) => {
    const page = await createBrowserPage(testContext, { admin: true });
    await page.goto("/admin/drinks/test-margarita/edit");
    await page.waitForFunction(() => document.documentElement.dataset.remixReady === "true");
    const filePicker = page.locator('input[type="file"]');
    await filePicker.setInputFiles("app/assets/images/background-768.jpg");
    const preview = page.getByAltText("Crop preview");
    const selection = page.getByRole("group", {
      name: "Use the arrow keys to move the crop selection area",
    });
    await selection.waitFor();
    if (gesture === "resize") {
      const imageBounds = await preview.boundingBox();
      if (!imageBounds) throw new Error("Crop preview has no bounds");
      await page.mouse.move(imageBounds.x + 2, imageBounds.y + 2);
      await page.mouse.down();
      await page.mouse.move(imageBounds.x + 70, imageBounds.y + 70);
      await page.mouse.up();
      await page.waitForFunction(() => {
        const crop = document.querySelector(
          '[role="group"][aria-label="Use the arrow keys to move the crop selection area"]',
        );
        return crop !== null && getComputedStyle(crop).width === "68px";
      });
    }
    const target =
      gesture === "draw"
        ? preview.locator("..")
        : gesture === "move"
          ? selection
          : page.getByRole("button", {
              name: "Use the arrow keys to move the south east drag handle to change the crop selection area",
            });
    // Retain the old target to prove queued movement cannot change the replacement crop.
    const moveOldTarget = await target.evaluateHandle((element) => {
      let start: PointerEvent | undefined;
      element.addEventListener(
        "pointerdown",
        (event) => {
          if (event instanceof PointerEvent) start = event;
        },
        { once: true },
      );
      return () => {
        if (!start) throw new Error("Crop gesture did not start");
        element.dispatchEvent(
          new PointerEvent("pointermove", {
            pointerId: start.pointerId,
            clientX: start.clientX + 30,
            clientY: start.clientY + 30,
          }),
        );
      };
    });
    const bounds = await target.boundingBox();
    if (!bounds) throw new Error("Crop gesture target has no bounds");
    await page.mouse.move(
      bounds.x + (gesture === "draw" ? 2 : bounds.width / 2),
      bounds.y + (gesture === "draw" ? 2 : bounds.height / 2),
    );
    await page.mouse.down();
    // Activate the button without releasing the active pointer first.
    await page.getByRole("button", { name: "Change image" }).evaluate((element) => {
      if (!(element instanceof HTMLElement)) throw new Error("Change image is not an HTML control");
      element.click();
    });
    await preview.waitFor({ state: "hidden" });
    await filePicker.setInputFiles("app/assets/images/background-768.jpg");
    await selection.waitFor();
    const replacementStyle = await selection.getAttribute("style");
    await moveOldTarget.evaluate((move) => move());
    await page.mouse.up();
    // Flush the same component through a real keyboard update before inspecting its crop.
    await selection.press("ArrowRight");
    await selection.press("ArrowLeft");
    await page.waitForFunction(
      (expectedStyle) => {
        return (
          document
            .querySelector(
              '[role="group"][aria-label="Use the arrow keys to move the crop selection area"]',
            )
            ?.getAttribute("style") === expectedStyle
        );
      },
      replacementStyle,
      { timeout: 2000 },
    );
    expect(await selection.getAttribute("style")).toBe(replacementStyle);
    await moveOldTarget.dispose();
  });
}

for (const corner of ["north west", "north east", "south east", "south west"]) {
  test(`${corner} crop handle preserves its opposite corner and clamps pointer and keyboard resizing`, async (testContext) => {
    const page = await createBrowserPage(testContext, { admin: true });
    await page.goto("/admin/drinks/test-margarita/edit");
    await page.waitForFunction(() => document.documentElement.dataset.remixReady === "true");
    await page.locator('input[type="file"]').setInputFiles("app/assets/images/background-768.jpg");
    const preview = page.getByAltText("Crop preview");
    const selection = page.getByRole("group", {
      name: "Use the arrow keys to move the crop selection area",
    });
    await selection.waitFor();
    const imageBounds = await preview.boundingBox();
    if (!imageBounds) throw new Error("Crop image has no bounds");
    const imageSize = await preview.evaluate((element) => {
      if (!(element instanceof HTMLImageElement)) throw new Error("Crop preview is not an image");
      return { width: element.width, height: element.height };
    });
    const waitForSize = (size: number) =>
      page.waitForFunction((expectedSize) => {
        const element = document.querySelector(
          '[role="group"][aria-label="Use the arrow keys to move the crop selection area"]',
        );
        return element !== null && parseFloat(getComputedStyle(element).width) === expectedSize;
      }, size);
    await page.mouse.move(imageBounds.x + 2, imageBounds.y + 2);
    await page.mouse.down();
    await page.mouse.move(imageBounds.x + 70, imageBounds.y + 70, { steps: 4 });
    await page.mouse.up();
    await waitForSize(68);

    const west = corner.includes("west"),
      north = corner.includes("north");
    const dragHandle = page.getByRole("button", {
      name: `Use the arrow keys to move the ${corner} drag handle to change the crop selection area`,
    });
    const drag = async (delta: number) => {
      const bounds = await dragHandle.boundingBox();
      if (!bounds) throw new Error("Crop handle has no bounds");
      const x = bounds.x + bounds.width / 2,
        y = bounds.y + bounds.height / 2;
      await page.mouse.move(x, y);
      await page.mouse.down();
      await page.mouse.move(x + delta, y, { steps: 4 });
      await page.mouse.up();
    };
    const assertSelection = async (size: number) => {
      await waitForSize(size);
      const bounds = await selection.boundingBox();
      if (!bounds) throw new Error("Crop selection has no bounds");
      expect(bounds.width).toBe(size);
      expect(bounds.height).toBe(size);
      expect(bounds.x - imageBounds.x + (west ? size : 0)).toBe(west ? 70 : 2);
      expect(bounds.y - imageBounds.y + (north ? size : 0)).toBe(north ? 70 : 2);
    };

    await drag(west ? 10 : -10);
    await assertSelection(58);
    await dragHandle.press(west ? "Shift+ArrowRight" : "Shift+ArrowLeft");
    await assertSelection(48);
    const maximumSize = Math.min(
      west ? 70 : imageSize.width - 2,
      north ? 70 : imageSize.height - 2,
    );
    await drag(west ? -1000 : 1000);
    await assertSelection(maximumSize);
    for (let step = 0; step < 4; step++) {
      await dragHandle.press(west ? "Control+ArrowRight" : "Control+ArrowLeft");
    }
    await assertSelection(1);
  });
}

test("image crop supports drawing and keyboard movement and uploads a square JPEG", async (testContext) => {
  const pageAsAdmin = await createBrowserPage(testContext, { admin: true });
  await pageAsAdmin.goto("/admin/drinks/test-margarita/edit");
  await pageAsAdmin.waitForFunction(() => document.documentElement.dataset.remixReady === "true");
  await pageAsAdmin
    .locator('input[type="file"]')
    .setInputFiles("app/assets/images/background-768.jpg");
  const preview = pageAsAdmin.getByAltText("Crop preview");
  await preview.waitFor();
  const selection = pageAsAdmin.getByRole("group", {
    name: "Use the arrow keys to move the crop selection area",
  });
  await selection.waitFor();
  const bounds = await preview.boundingBox();
  if (!bounds) throw new Error("Crop image has no bounds");
  await pageAsAdmin.mouse.move(bounds.x + 2, bounds.y + 2);
  await pageAsAdmin.mouse.down();
  await pageAsAdmin.mouse.move(bounds.x + 70, bounds.y + 70, { steps: 4 });
  await pageAsAdmin.mouse.up();
  await pageAsAdmin.waitForFunction(() => {
    const selectionElement = document.querySelector(
      '[role="group"][aria-label="Use the arrow keys to move the crop selection area"]',
    );
    return (
      selectionElement !== null &&
      getComputedStyle(selectionElement).getPropertyValue("width") === "68px"
    );
  });
  expect(
    await selection.evaluate(
      (element, propertyName) => getComputedStyle(element).getPropertyValue(propertyName),
      "width",
    ),
  ).toBe("68px");
  await selection.focus();
  await selection.press("ArrowRight");
  await pageAsAdmin.waitForFunction(() => {
    const selectionElement = document.querySelector(
      '[role="group"][aria-label="Use the arrow keys to move the crop selection area"]',
    );
    return (
      selectionElement !== null &&
      getComputedStyle(selectionElement).getPropertyValue("left") === "3px"
    );
  });
  expect(
    await selection.evaluate(
      (element, propertyName) => getComputedStyle(element).getPropertyValue(propertyName),
      "left",
    ),
  ).toBe("3px");
  await pageAsAdmin
    .getByRole("button", {
      name: "Use the arrow keys to move the south east drag handle to change the crop selection area",
    })
    .focus();
  await pageAsAdmin
    .getByRole("button", {
      name: "Use the arrow keys to move the south east drag handle to change the crop selection area",
    })
    .press("ArrowRight");
  await pageAsAdmin.waitForFunction(() => {
    const selectionElement = document.querySelector(
      '[role="group"][aria-label="Use the arrow keys to move the crop selection area"]',
    );
    return (
      selectionElement !== null &&
      getComputedStyle(selectionElement).getPropertyValue("width") === "69px"
    );
  });
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
  await pageAsAdmin.getByRole("status").filter({ hasText: "Drink updated!" }).waitFor();
  expect(await pageAsAdmin.getByRole("status").innerText()).toContain("Drink updated!");
});

test("a canceled toast gesture resumes its expiration", async (testContext) => {
  const page = await createBrowserPage(testContext, { admin: true });
  await page.goto("/admin/drinks/test-margarita/edit");
  await page.waitForFunction(() => document.documentElement.dataset.remixReady === "true");
  await page.clock.install();
  await page.getByRole("button", { name: "Update Drink" }).click();
  const notification = page.getByRole("status").filter({ hasText: "Drink updated!" });
  await notification.waitFor();
  const bounds = await notification.boundingBox();
  if (!bounds) throw new Error("Notification must be visible");
  await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
  await page.mouse.down();
  await page.clock.runFor(5000);
  expect(await notification.isVisible()).toBe(true);
  await notification.dispatchEvent("pointercancel", { pointerId: 1, pointerType: "mouse" });
  await page.clock.runFor(4500);
  await notification.waitFor({ state: "hidden" });
  await page.mouse.up();
});
