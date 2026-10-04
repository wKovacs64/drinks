import { test, describe } from "remix/test";
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
