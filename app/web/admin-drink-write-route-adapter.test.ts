import { describe, expect, test, vi } from "vitest";
import { getToast } from "#/app/core/toast.server";
import type { AdminDrinksWriteService } from "#/app/modules/drinks/drinks";
import {
  createAdminDrinkActionAdapter,
  updateAdminDrinkActionAdapter,
} from "./admin-drink-write-route-adapter.server";

function buildDrinkFormData(input: { slug?: string; imageFile?: File } = {}) {
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

  return formData;
}

function buildCreateRequest(input: { slug?: string; imageFile?: File } = {}) {
  return new Request("http://test.local/admin/drinks/new", {
    method: "POST",
    body: buildDrinkFormData(input),
  });
}

function buildUpdateRequest(input: { slug?: string; imageFile?: File } = {}) {
  return new Request("http://test.local/admin/drinks/old-fashioned/edit", {
    method: "POST",
    body: buildDrinkFormData(input),
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

describe("updateAdminDrinkActionAdapter", () => {
  test("updates through the admin write path without an image buffer when keeping the current image", async () => {
    const adminDrinksWriteService = buildService({
      update: vi.fn().mockResolvedValue({
        kind: "success",
        drinkSlug: "adapter-cocktail",
        notices: [],
      }),
    });

    let redirectResponse: Response | undefined;
    try {
      await updateAdminDrinkActionAdapter({
        request: buildUpdateRequest(),
        slug: "old-fashioned",
        adminDrinksWriteService,
      });
    } catch (error) {
      if (!(error instanceof Response)) throw error;
      redirectResponse = error;
    }

    expect(redirectResponse).toMatchObject({ status: 302 });
    expect(redirectResponse?.headers.get("Location")).toBe("/admin/drinks");
    expect(adminDrinksWriteService.update).toHaveBeenCalledWith({
      slug: "old-fashioned",
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
      imageBuffer: undefined,
    });

    const { toast } = await getToast(
      new Request("http://test.local/admin", {
        headers: { Cookie: redirectResponse?.headers.get("Set-Cookie") ?? "" },
      }),
    );
    expect(toast).toEqual({ kind: "success", message: "Drink updated!" });
  });

  test("translates typed duplicate slug update outcomes into slug field errors", async () => {
    const adminDrinksWriteService = buildService({
      update: vi.fn().mockResolvedValue({
        kind: "fieldError",
        fieldErrors: { slug: ["Slug already exists"] },
        formErrors: [],
      }),
    });

    const response = await updateAdminDrinkActionAdapter({
      request: buildUpdateRequest({ slug: "test-margarita" }),
      slug: "old-fashioned",
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

  test("translates typed missing update targets into not-found responses", async () => {
    const adminDrinksWriteService = buildService({
      update: vi.fn().mockResolvedValue({ kind: "notFound", slug: "missing-drink" }),
    });

    await expect(
      updateAdminDrinkActionAdapter({
        request: buildUpdateRequest(),
        slug: "missing-drink",
        adminDrinksWriteService,
      }),
    ).rejects.toMatchObject({ status: 404 });
  });

  test("translates old image cleanup notices into the existing warning toast", async () => {
    const adminDrinksWriteService = buildService({
      update: vi.fn().mockResolvedValue({
        kind: "success",
        drinkSlug: "adapter-cocktail",
        notices: [
          {
            code: "oldImageCleanupFailed",
            message: "Old image cleanup failed",
          },
        ],
      }),
    });

    let redirectResponse: Response | undefined;
    try {
      await updateAdminDrinkActionAdapter({
        request: buildUpdateRequest({
          imageFile: new File(["replacement-image"], "drink.png", { type: "image/png" }),
        }),
        slug: "old-fashioned",
        adminDrinksWriteService,
      });
    } catch (error) {
      if (!(error instanceof Response)) throw error;
      redirectResponse = error;
    }

    expect(adminDrinksWriteService.update).toHaveBeenCalledWith(
      expect.objectContaining({ imageBuffer: Buffer.from("replacement-image") }),
    );

    const { toast } = await getToast(
      new Request("http://test.local/admin", {
        headers: { Cookie: redirectResponse?.headers.get("Set-Cookie") ?? "" },
      }),
    );
    expect(toast).toEqual({
      kind: "warning",
      message: "Drink updated, but old image cleanup failed",
    });
  });
});
