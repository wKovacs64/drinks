import { beforeEach, describe, expect, test, vi } from "vitest";
import { getToast } from "#/app/core/toast.server";
import { resetAndSeedDatabase } from "#/app/db/reset.server";
import { action } from "./admin.drinks.$slug.edit";

const { uploadImage, deleteImage } = vi.hoisted(() => ({
  uploadImage: vi.fn(),
  deleteImage: vi.fn(),
}));

vi.mock("#/app/integrations/imagekit.server", () => ({
  uploadImage,
  deleteImage,
}));

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

function unwrapData(result: { data: unknown; init?: ResponseInit | null }) {
  return {
    body: result.data,
    status: result.init?.status ?? 200,
  };
}

beforeEach(async () => {
  await resetAndSeedDatabase();
  uploadImage.mockReset();
  deleteImage.mockReset();
  uploadImage.mockResolvedValue({
    url: "https://ik.imagekit.io/test/drinks/test-margarita.jpg",
    fileId: "replacement-file-id",
  });
  deleteImage.mockResolvedValue(undefined);
});

describe("admin edit drink route", () => {
  test("updates a drink through the Drinks module and redirects with a toast", async () => {
    const formData = new FormData();
    formData.set("title", "Updated Margarita");
    formData.set("slug", "test-margarita");
    formData.set("ingredients", "3 oz tequila\n1.5 oz lime juice");
    formData.set("calories", "250");
    formData.set("tags", "tequila, updated");
    formData.set("notes", "Updated notes");
    formData.set("rank", "5");
    formData.set("status", "published");

    const response = await catchRedirect(() =>
      action({
        request: new Request("http://localhost/admin/drinks/test-margarita/edit", {
          method: "POST",
          body: formData,
        }),
        params: { slug: "test-margarita" },
      } as never),
    );

    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toBe("/admin/drinks");
    expect(response.headers.get("Set-Cookie")).toContain("__toast=");
  });

  test("returns a warning toast when old image cleanup fails after a successful update", async () => {
    deleteImage.mockRejectedValue(new Error("cleanup failed"));

    const formData = new FormData();
    formData.set("title", "Test Margarita");
    formData.set("slug", "test-margarita");
    formData.set("ingredients", "2 oz tequila\n1 oz lime juice\n1 oz triple sec");
    formData.set("calories", "200");
    formData.set("tags", "tequila, citrus");
    formData.set("notes", "A classic test margarita");
    formData.set("rank", "10");
    formData.set("status", "published");
    formData.set("imageFile", new File(["new-image"], "drink.png", { type: "image/png" }));

    const response = await catchRedirect(() =>
      action({
        request: new Request("http://localhost/admin/drinks/test-margarita/edit", {
          method: "POST",
          body: formData,
        }),
        params: { slug: "test-margarita" },
      } as never),
    );

    expect(response.status).toBe(302);

    const { toast } = await getToast(
      new Request("http://localhost/admin", {
        headers: { Cookie: response.headers.get("Set-Cookie")! },
      }),
    );

    expect(toast).toEqual({
      kind: "warning",
      message: "Drink updated, but old image cleanup failed",
    });
  });

  test("returns routeAction field errors when updating to a duplicate slug", async () => {
    const formData = new FormData();
    formData.set("title", "Updated Margarita");
    formData.set("slug", "test-mojito");
    formData.set("ingredients", "3 oz tequila\n1.5 oz lime juice");
    formData.set("calories", "250");
    formData.set("tags", "tequila, updated");
    formData.set("notes", "Updated notes");
    formData.set("rank", "5");
    formData.set("status", "published");

    const response = await action({
      request: new Request("http://localhost/admin/drinks/test-margarita/edit", {
        method: "POST",
        body: formData,
      }),
      params: { slug: "test-margarita" },
    } as never);

    const result = unwrapData(response as { data: unknown; init?: ResponseInit | null });

    expect(result.status).toBe(400);
    expect(result.body).toEqual({
      actionIntent: undefined,
      fieldErrors: {
        slug: ["Slug already exists"],
      },
      formErrors: [],
    });
  });
});
