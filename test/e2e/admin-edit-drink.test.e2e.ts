import { test, describe } from "remix/test";
import { expect } from "remix/assert";
import { createBrowserPage } from "#/test/e2e.ts";

describe("Edit Drink", () => {
  test("can edit an existing drink", async (testContext) => {
    const pageAsAdmin = await createBrowserPage(testContext, { admin: true });
    await pageAsAdmin.goto("/admin/drinks/test-margarita/edit");
    await pageAsAdmin.waitForFunction(() => document.documentElement.dataset.remixReady === "true");

    // Should see the form pre-filled with existing values
    await pageAsAdmin.getByRole("heading", { name: "Edit Drink" }).waitFor();
    expect(await pageAsAdmin.getByLabel("Title").inputValue()).toBe("Test Margarita");
    expect(await pageAsAdmin.getByLabel("Slug").inputValue()).toBe("test-margarita");
    expect(await pageAsAdmin.getByLabel("Calories").inputValue()).toBe("200");

    // Update the title
    await pageAsAdmin.getByLabel("Title").fill("Updated Margarita");

    // Submit the form
    await pageAsAdmin.getByRole("button", { name: "Update Drink" }).click();

    // Should redirect to drinks list
    await pageAsAdmin.waitForURL("/admin/drinks");

    // Updated drink should appear in list
    await pageAsAdmin.getByRole("cell", { name: "Updated Margarita" }).waitFor();
  });

  test("does not publicly cache an unpublished drink shown to an admin", async (testContext) => {
    const pageAsAdmin = await createBrowserPage(testContext, { admin: true });
    await pageAsAdmin.goto("/admin/drinks/test-margarita/edit");
    await pageAsAdmin.waitForFunction(() => document.documentElement.dataset.remixReady === "true");
    await pageAsAdmin.getByRole("button", { name: "Unpublished" }).click();
    await pageAsAdmin.getByRole("button", { name: "Update Drink" }).click();
    await pageAsAdmin.waitForURL("/admin/drinks");

    const response = await pageAsAdmin.goto("/test-margarita");

    expect(response?.headers()["cache-control"]).toContain("private");
    expect(response?.headers()["cache-control"]).toContain("no-store");
    await pageAsAdmin.getByRole("heading", { name: "Test Margarita" }).waitFor();
  });
});
