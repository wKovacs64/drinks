import { test } from "remix/test";
import { expect } from "remix/assert";
import { createBrowserPage } from "#/test/e2e.ts";
import { getDb } from "#/app/db/client.ts";
import { drinks } from "#/app/db/schema.ts";

test("native create preserves invalid draft values and saves without JavaScript", async (testContext) => {
  const page = await createBrowserPage(testContext, { admin: true, javaScriptEnabled: false });
  page.setDefaultTimeout(10000);
  await page.goto("/admin/drinks/new");
  expect(await page.getByLabel("Image", { exact: true }).isVisible()).toBe(true);
  await page.getByLabel("Title", { exact: true }).fill("Native drink");
  await page.getByLabel("Slug", { exact: true }).fill("test-mojito");
  await page.getByLabel("Ingredients (one per line)").fill("1 oz gin\n2 oz tonic");
  await page.getByLabel("Calories").fill("123");
  await page.getByLabel("Tags (comma-separated)").fill("gin, citrus");
  await page.getByLabel("Notes (markdown)").fill("Keep native notes");
  await page.getByLabel("Rank").fill("7");
  await page.getByRole("radio", { name: "Unpublished", exact: true }).check();
  await page
    .getByLabel("Image", { exact: true })
    .setInputFiles("app/assets/images/background-768.jpg");
  const failure = page.waitForResponse((response) => response.request().method() === "POST");
  await page.getByRole("button", { name: "Create Drink" }).click();
  expect((await failure).status()).toBe(400);
  await page.getByRole("alert").filter({ hasText: "Slug already exists" }).waitFor();
  expect(await page.getByLabel("Title", { exact: true }).inputValue()).toBe("Native drink");
  expect(await page.getByLabel("Slug", { exact: true }).inputValue()).toBe("test-mojito");
  expect(await page.getByLabel("Ingredients (one per line)").inputValue()).toBe(
    "1 oz gin\n2 oz tonic",
  );
  expect(await page.getByLabel("Calories").inputValue()).toBe("123");
  expect(await page.getByLabel("Tags (comma-separated)").inputValue()).toBe("gin, citrus");
  expect(await page.getByLabel("Notes (markdown)").inputValue()).toBe("Keep native notes");
  expect(await page.getByLabel("Rank").inputValue()).toBe("7");
  expect(await page.getByRole("radio", { name: "Unpublished", exact: true }).isChecked()).toBe(
    true,
  );
  await page.getByText("Select the image again before saving.", { exact: true }).waitFor();
  await page.getByLabel("Slug", { exact: true }).fill("native-drink");
  await page
    .getByLabel("Image", { exact: true })
    .setInputFiles("app/assets/images/background-768.jpg");
  await page.getByRole("button", { name: "Create Drink" }).click();
  await page.waitForURL("/admin/drinks");
  await page.getByRole("cell", { name: "Native drink", exact: true }).waitFor();
  const saved = await getDb().findOne(drinks, { where: { slug: "native-drink" } });
  expect(saved?.status).toBe("unpublished");
});

test("native edit preserves validation failures and existing image without JavaScript", async (testContext) => {
  const page = await createBrowserPage(testContext, { admin: true, javaScriptEnabled: false });
  const before = await getDb().findOne(drinks, { where: { slug: "test-margarita" } });
  page.setDefaultTimeout(10000);
  await page.goto("/admin/drinks/test-margarita/edit");
  await page.getByLabel("Title", { exact: true }).fill("Native edited margarita");
  await page.getByLabel("Slug", { exact: true }).fill("test-mojito");
  await page.getByRole("radio", { name: "Unpublished", exact: true }).check();
  await page.getByRole("button", { name: "Update Drink" }).click();
  await page.getByRole("alert").filter({ hasText: "Slug already exists" }).waitFor();
  expect(new URL(page.url()).pathname).toBe("/admin/drinks/test-margarita/edit");
  expect(await page.getByLabel("Title", { exact: true }).inputValue()).toBe(
    "Native edited margarita",
  );
  expect(await page.getByRole("radio", { name: "Unpublished", exact: true }).isChecked()).toBe(
    true,
  );
  expect(await page.getByAltText("Current").count()).toBe(1);
  await page.getByLabel("Slug", { exact: true }).fill("native-edited-margarita");
  await page.getByRole("button", { name: "Update Drink" }).click();
  await page.waitForURL("/admin/drinks");
  const saved = await getDb().findOne(drinks, { where: { slug: "native-edited-margarita" } });
  expect(saved?.status).toBe("unpublished");
  expect(saved?.image_url).toBe(before?.image_url);
});

test("soft navigation replaces an editor draft and its save endpoint", async (testContext) => {
  const page = await createBrowserPage(testContext, { admin: true });
  page.setDefaultTimeout(10000);
  await page.goto("/admin/drinks/test-margarita/edit");
  await page.waitForFunction(() => document.documentElement.dataset.remixReady === "true");
  await page.getByLabel("Title", { exact: true }).fill("Abandoned draft");
  await page.evaluate(() => {
    Reflect.set(window, "editorNavigationMarker", "same document");
    const link = document.createElement("a");
    link.href = "/admin/drinks/test-mojito/edit";
    link.textContent = "Switch editor";
    document.body.append(link);
    link.click();
  });
  await page.waitForURL("/admin/drinks/test-mojito/edit");
  await page.waitForFunction(
    () => document.querySelector('form[action="/admin/drinks/test-mojito/edit"]') !== null,
  );
  expect(await page.evaluate(() => Reflect.get(window, "editorNavigationMarker"))).toBe(
    "same document",
  );
  expect(await page.getByLabel("Title", { exact: true }).inputValue()).toBe("Test Mojito");
  expect(await page.getByLabel("Slug", { exact: true }).inputValue()).toBe("test-mojito");
  await page.getByLabel("Title", { exact: true }).fill("Correct mojito editor");
  const save = page.waitForResponse((response) => response.request().method() === "POST");
  await page.getByRole("button", { name: "Update Drink" }).click();
  expect(new URL((await save).url()).pathname).toBe("/admin/drinks/test-mojito/edit");
  await page.waitForURL("/admin/drinks");
  expect((await getDb().findOne(drinks, { where: { slug: "test-margarita" } }))?.title).toBe(
    "Test Margarita",
  );
  expect((await getDb().findOne(drinks, { where: { slug: "test-mojito" } }))?.title).toBe(
    "Correct mojito editor",
  );
});
