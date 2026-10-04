import { test, describe } from "remix/test";
import { createBrowserPage } from "#/test/e2e.ts";

describe("Delete Drink", () => {
  test("can delete a drink via the UI", async (testContext) => {
    const pageAsAdmin = await createBrowserPage(testContext, { admin: true });
    await pageAsAdmin.goto("/admin/drinks");
    await pageAsAdmin.waitForFunction(() => document.documentElement.dataset.remixReady === "true");
    await pageAsAdmin.getByText("Test Old Fashioned").waitFor();

    // Set up dialog handler before clicking delete
    pageAsAdmin.on("dialog", (dialog) => dialog.accept());

    // Click the delete button in the Test Old Fashioned row
    const row = pageAsAdmin.getByRole("row").filter({ hasText: "Test Old Fashioned" });
    await row.getByRole("button", { name: "Delete" }).click();

    // Drink should be removed from the list
    await pageAsAdmin.getByText("Test Old Fashioned").waitFor({ state: "hidden" });
  });
});
