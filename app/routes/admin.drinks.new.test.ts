import { beforeEach, describe, expect, test } from "vitest";
import { resetAndSeedDatabase } from "#/app/db/reset.server";
import { action } from "./admin.drinks.new";

async function catchRedirect(fn: () => Promise<unknown>): Promise<Response> {
  try {
    await fn();
    throw new Error("Expected redirect");
  } catch (error) {
    if (error instanceof Response) {
      return error;
    }

    throw error;
  }
}

beforeEach(async () => {
  await resetAndSeedDatabase();
});

describe("admin create drink route", () => {
  test("creates a drink through the new Drinks module and redirects with a toast", async () => {
    const formData = new FormData();
    formData.set("title", "Test Cocktail");
    formData.set("slug", "test-cocktail");
    formData.set("ingredients", "gin\ntonic");
    formData.set("calories", "150");
    formData.set("tags", "gin, refreshing");
    formData.set("notes", "");
    formData.set("rank", "0");
    formData.set("status", "published");
    formData.set("imageFile", new File(["fake-image"], "drink.png", { type: "image/png" }));

    const response = await catchRedirect(() =>
      action({
        request: new Request("http://localhost/admin/drinks/new", {
          method: "POST",
          body: formData,
        }),
      } as never),
    );

    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toBe("/admin/drinks");
    expect(response.headers.get("Set-Cookie")).toContain("__toast=");
  });
});
