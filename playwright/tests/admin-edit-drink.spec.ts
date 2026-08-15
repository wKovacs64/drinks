import { test, expect } from "#/playwright/playwright-utils";

test.describe("Edit Drink", () => {
  test("can edit an existing drink", async ({ pageAsAdmin }) => {
    await pageAsAdmin.goto("/admin/drinks/test-margarita/edit");

    // Should see the form pre-filled with existing values
    await expect(pageAsAdmin.getByRole("heading", { name: "Edit Drink" })).toBeVisible();
    await expect(pageAsAdmin.getByLabel("Title")).toHaveValue("Test Margarita");
    await expect(pageAsAdmin.getByLabel("Slug")).toHaveValue("test-margarita");
    await expect(pageAsAdmin.getByLabel("Calories")).toHaveValue("200");

    // Update the title
    await pageAsAdmin.getByLabel("Title").fill("Updated Margarita");

    // Submit the form
    await pageAsAdmin.getByRole("button", { name: "Update Drink" }).click();

    // Should redirect to drinks list
    await expect(pageAsAdmin).toHaveURL("/admin/drinks");

    // Updated drink should appear in list
    await expect(pageAsAdmin.getByRole("cell", { name: "Updated Margarita" })).toBeVisible();
  });

  test("does not publicly cache an unpublished drink shown to an admin", async ({
    pageAsAdmin,
  }) => {
    await pageAsAdmin.goto("/admin/drinks/test-margarita/edit");
    await pageAsAdmin.getByRole("button", { name: "Unpublished" }).click();
    await pageAsAdmin.getByRole("button", { name: "Update Drink" }).click();
    await expect(pageAsAdmin).toHaveURL("/admin/drinks");

    const response = await pageAsAdmin.goto("/test-margarita");

    expect(response?.headers()["cache-control"]).toContain("private");
    expect(response?.headers()["cache-control"]).toContain("no-store");
    await expect(pageAsAdmin.getByRole("heading", { name: "Test Margarita" })).toBeVisible();
  });
});
