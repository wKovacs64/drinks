import { beforeEach, describe, expect, test } from "vitest";
import { resetAndSeedDatabase } from "#/app/db/reset.server";
import { action } from "./admin.drinks.$slug.delete";

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

describe("admin delete drink route", () => {
  test("deletes a drink through the Drinks module and redirects with a toast", async () => {
    const response = await catchRedirect(() =>
      action({
        request: new Request("http://localhost/admin/drinks/test-margarita/delete", {
          method: "POST",
          body: new FormData(),
        }),
        params: { slug: "test-margarita" },
      } as never),
    );

    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toBe("/admin/drinks");
    expect(response.headers.get("Set-Cookie")).toContain("__toast=");
  });
});
