import { test, describe } from "remix/test";
import { createBrowserPage } from "#/test/e2e.ts";

describe("Smoke Tests", () => {
  test("homepage loads with seeded drinks", async (testContext) => {
    const page = await createBrowserPage(testContext);
    await page.goto("/");

    // Check that seeded drinks appear
    await page.getByText("Test Margarita").waitFor();
    await page.getByText("Test Mojito").waitFor();
    await page.getByText("Test Old Fashioned").waitFor();
  });

  test("drink detail page loads", async (testContext) => {
    const page = await createBrowserPage(testContext);
    await page.goto("/test-margarita");

    // Use heading role to avoid matching breadcrumb and notes
    await page.getByRole("heading", { name: "Test Margarita" }).waitFor();
    await page.getByText("2 oz tequila").waitFor();
    // calories
    await page.getByText("200").waitFor();
  });
});
