import { test, describe } from "remix/test";
import { createBrowserPage } from "#/test/e2e.ts";
import { expect } from "remix/assert";
import { http, HttpResponse } from "msw/http";
import { server as requestMocks } from "#/test/server.ts";

describe("Delete Drink", () => {
  test("a document load consumes its deletion notification once", async (testContext) => {
    const page = await createBrowserPage(testContext, { admin: true });

    const deletion = await page.request.post("/admin/drinks/test-mojito/delete", {
      maxRedirects: 0,
    });

    expect(deletion.status()).toBe(303);
    expect(deletion.headers().location).toBe("/admin/drinks");
    await page.goto("/admin/drinks");
    await page.getByRole("status").filter({ hasText: "Drink deleted!" }).waitFor();
    expect(await page.getByRole("cell", { name: "Test Mojito", exact: true }).count()).toBe(0);
    await page.reload();
    await page.waitForFunction(() => document.documentElement.dataset.remixReady === "true");
    expect(await page.getByRole("status").count()).toBe(0);
  });

  test("can delete a drink with warnings after image cleanup and network purge failures", async (testContext) => {
    const logError = testContext.mock.method(console, "error", () => undefined);
    const pageAsAdmin = await createBrowserPage(testContext, { admin: true });
    requestMocks.use(
      http.delete(
        "https://api.imagekit.io/v1/files/:fileId",
        () => new HttpResponse("private image integration details", { status: 400 }),
      ),
      http.post("https://api.fastly.com/service/:serviceId/purge", () => HttpResponse.error()),
    );
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
    const notification = pageAsAdmin.getByRole("status");
    const expectedMessage = "Drink deleted, but old image cleanup failed and cache refresh failed";
    await notification.filter({ hasText: expectedMessage }).waitFor();
    expect(await notification.getAttribute("data-kind")).toBe("warning");
    expect(await notification.innerText()).toBe(expectedMessage);
    expect((await pageAsAdmin.request.get("/test-old-fashioned")).status()).toBe(404);
    expect(
      logError.mock.calls.map(({ arguments: [message, context, cause] }): unknown[] => [
        message,
        context,
        String(cause),
      ]),
    ).toEqual([
      [
        "Failed to clean up old image after committed write:",
        { fileId: "seed-fileId-3" },
        "Error: 400 private image integration details",
      ],
      [
        "Failed to refresh cache after committed write:",
        { slugs: ["test-old-fashioned"], tags: ["bourbon", "classic"] },
        "TypeError: fetch failed",
      ],
    ]);
  });
});
