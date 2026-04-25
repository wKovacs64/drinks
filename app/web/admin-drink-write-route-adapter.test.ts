import { describe, expect, test, vi } from "vitest";
import { getToast } from "#/app/core/toast.server";
import type { AdminDrinksWriteService } from "#/app/modules/drinks/drinks";
import { createAdminDrinkActionAdapter } from "./admin-drink-write-route-adapter.server";

function buildCreateRequest(input: { slug?: string; imageFile?: File } = {}) {
  const formData = new FormData();
  formData.set("title", "Adapter Cocktail");
  formData.set("slug", input.slug ?? "adapter-cocktail");
  formData.set("ingredients", "gin\ntonic");
  formData.set("calories", "150");
  formData.set("tags", "gin, refreshing");
  formData.set("notes", "");
  formData.set("rank", "0");
  formData.set("status", "published");

  if (input.imageFile) {
    formData.set("imageFile", input.imageFile);
  }

  return new Request("http://test.local/admin/drinks/new", {
    method: "POST",
    body: formData,
  });
}

function buildService(overrides: Partial<AdminDrinksWriteService> = {}): AdminDrinksWriteService {
  return {
    create: vi.fn().mockResolvedValue({
      kind: "success",
      drinkSlug: "adapter-cocktail",
      notices: [],
    }),
    update: vi.fn(),
    delete: vi.fn(),
    ...overrides,
  };
}

describe("createAdminDrinkActionAdapter", () => {
  test("returns image field errors before calling the admin write path", async () => {
    const adminDrinksWriteService = buildService();

    const response = await createAdminDrinkActionAdapter({
      request: buildCreateRequest(),
      adminDrinksWriteService,
    });

    expect(response).toMatchObject({
      data: {
        fieldErrors: { imageFile: ["Image is required"] },
        formErrors: [],
      },
      init: { status: 400 },
    });
    expect(adminDrinksWriteService.create).not.toHaveBeenCalled();
  });

  test("creates through the admin write path and redirects with the existing success toast", async () => {
    const adminDrinksWriteService = buildService();

    let redirectResponse: Response | undefined;
    try {
      await createAdminDrinkActionAdapter({
        request: buildCreateRequest({
          imageFile: new File(["fake-image"], "drink.png", { type: "image/png" }),
        }),
        adminDrinksWriteService,
      });
    } catch (error) {
      if (!(error instanceof Response)) throw error;
      redirectResponse = error;
    }

    expect(redirectResponse).toMatchObject({ status: 302 });
    expect(redirectResponse?.headers.get("Location")).toBe("/admin/drinks");
    expect(adminDrinksWriteService.create).toHaveBeenCalledWith({
      draft: {
        title: "Adapter Cocktail",
        slug: "adapter-cocktail",
        ingredients: ["gin", "tonic"],
        calories: 150,
        tags: ["gin", "refreshing"],
        notes: null,
        rank: 0,
        status: "published",
      },
      imageBuffer: Buffer.from("fake-image"),
    });

    const { toast } = await getToast(
      new Request("http://test.local/admin", {
        headers: { Cookie: redirectResponse?.headers.get("Set-Cookie") ?? "" },
      }),
    );
    expect(toast).toEqual({ kind: "success", message: "Drink created!" });
  });

  test("translates typed duplicate slug outcomes into slug field errors", async () => {
    const adminDrinksWriteService = buildService({
      create: vi.fn().mockResolvedValue({
        kind: "fieldError",
        fieldErrors: { slug: ["Slug already exists"] },
        formErrors: [],
      }),
    });

    const response = await createAdminDrinkActionAdapter({
      request: buildCreateRequest({
        slug: "test-margarita",
        imageFile: new File(["fake-image"], "drink.png", { type: "image/png" }),
      }),
      adminDrinksWriteService,
    });

    expect(response).toMatchObject({
      data: {
        fieldErrors: { slug: ["Slug already exists"] },
        formErrors: [],
      },
      init: { status: 400 },
    });
  });
});
