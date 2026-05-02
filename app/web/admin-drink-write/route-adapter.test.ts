import { describe, expect, test, vi } from "vitest";
import { getToast } from "#/app/core/toast.server";
import type { AdminDrinksWriteService } from "#/app/modules/drinks/drinks";
import {
  createAdminDrinkActionAdapter,
  deleteAdminDrinkActionAdapter,
  updateAdminDrinkActionAdapter,
} from "./route-adapter.server";

function buildDrinkFormData(input: { slug?: string; title?: string; imageFile?: File } = {}) {
  const formData = new FormData();
  formData.set("title", input.title ?? "Adapter Cocktail");
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

function buildCreateRequest(input: { slug?: string; title?: string; imageFile?: File } = {}) {
  return new Request("http://test.local/admin/drinks/new", {
    method: "POST",
    body: buildDrinkFormData(input),
  });
}

function buildUpdateRequest(input: { slug?: string; title?: string; imageFile?: File } = {}) {
  return new Request("http://test.local/admin/drinks/old-fashioned/edit", {
    method: "POST",
    body: buildDrinkFormData(input),
  });
}

function buildDeleteRequest() {
  return new Request("http://test.local/admin/drinks/old-fashioned/delete", {
    method: "POST",
    body: new FormData(),
  });
}

function buildService(overrides: Partial<AdminDrinksWriteService> = {}): AdminDrinksWriteService {
  return {
    create: vi.fn().mockResolvedValue({
      kind: "success",
      drinkSlug: "adapter-cocktail",
      notices: [],
    }),
    update: vi.fn().mockResolvedValue({
      kind: "success",
      drinkSlug: "adapter-cocktail",
      notices: [],
    }),
    delete: vi.fn().mockResolvedValue({ kind: "success" }),
    ...overrides,
  };
}

async function catchThrownResponse(fn: () => Promise<unknown>): Promise<Response> {
  try {
    await fn();
    throw new Error("Expected a Response to be thrown");
  } catch (error) {
    if (error instanceof Response) {
      return error;
    }

    throw error;
  }
}

async function readToastFromResponse(response: Response) {
  const { toast } = await getToast(
    new Request("http://test.local/admin", {
      headers: { Cookie: response.headers.get("Set-Cookie") ?? "" },
    }),
  );

  return toast;
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

  test("returns drink draft schema field errors before calling the admin write path", async () => {
    const adminDrinksWriteService = buildService();

    const response = await createAdminDrinkActionAdapter({
      request: buildCreateRequest({
        slug: "Invalid Slug",
        imageFile: new File(["fake-image"], "drink.png", { type: "image/png" }),
      }),
      adminDrinksWriteService,
    });

    expect(response).toMatchObject({
      data: {
        fieldErrors: {
          slug: ["Slug must be lowercase letters, numbers, and hyphens"],
        },
        formErrors: [],
      },
      init: { status: 400 },
    });
    expect(adminDrinksWriteService.create).not.toHaveBeenCalled();
  });

  test("creates through the admin write path and redirects with the existing success toast", async () => {
    const adminDrinksWriteService = buildService();

    const redirectResponse = await catchThrownResponse(() =>
      createAdminDrinkActionAdapter({
        request: buildCreateRequest({
          imageFile: new File(["fake-image"], "drink.png", { type: "image/png" }),
        }),
        adminDrinksWriteService,
      }),
    );

    expect(redirectResponse).toMatchObject({ status: 302 });
    expect(redirectResponse.headers.get("Location")).toBe("/admin/drinks");
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

    await expect(readToastFromResponse(redirectResponse)).resolves.toEqual({
      kind: "success",
      message: "Drink created!",
    });
  });

  test("preserves all typed create field errors from the admin write path", async () => {
    const adminDrinksWriteService = buildService({
      create: vi.fn().mockResolvedValue({
        kind: "fieldError",
        fieldErrors: {
          slug: ["Slug already exists"],
          title: ["Title is invalid"],
        },
        formErrors: ["Drink could not be created"],
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
        fieldErrors: {
          slug: ["Slug already exists"],
          title: ["Title is invalid"],
        },
        formErrors: ["Drink could not be created"],
      },
      init: { status: 400 },
    });
  });
});

describe("deleteAdminDrinkActionAdapter", () => {
  test("deletes through the admin write path and redirects with the existing success toast", async () => {
    const adminDrinksWriteService = buildService({
      delete: vi.fn().mockResolvedValue({ kind: "success" }),
    });

    const redirectResponse = await catchThrownResponse(() =>
      deleteAdminDrinkActionAdapter({
        request: buildDeleteRequest(),
        slug: "old-fashioned",
        adminDrinksWriteService,
      }),
    );

    expect(redirectResponse).toMatchObject({ status: 302 });
    expect(redirectResponse.headers.get("Location")).toBe("/admin/drinks");
    expect(adminDrinksWriteService.delete).toHaveBeenCalledWith({ slug: "old-fashioned" });

    await expect(readToastFromResponse(redirectResponse)).resolves.toEqual({
      kind: "success",
      message: "Drink deleted!",
    });
  });

  test("translates typed missing delete targets into not-found responses", async () => {
    const adminDrinksWriteService = buildService({
      delete: vi.fn().mockResolvedValue({ kind: "notFound", slug: "missing-drink" }),
    });

    const response = await catchThrownResponse(() =>
      deleteAdminDrinkActionAdapter({
        request: buildDeleteRequest(),
        slug: "missing-drink",
        adminDrinksWriteService,
      }),
    );

    expect(response.status).toBe(404);
  });
});

describe("updateAdminDrinkActionAdapter", () => {
  test("returns drink draft schema field errors before calling the admin write path", async () => {
    const adminDrinksWriteService = buildService();

    const response = await updateAdminDrinkActionAdapter({
      request: buildUpdateRequest({ slug: "Invalid Slug" }),
      slug: "old-fashioned",
      adminDrinksWriteService,
    });

    expect(response).toMatchObject({
      data: {
        fieldErrors: {
          slug: ["Slug must be lowercase letters, numbers, and hyphens"],
        },
        formErrors: [],
      },
      init: { status: 400 },
    });
    expect(adminDrinksWriteService.update).not.toHaveBeenCalled();
  });

  test("updates through the admin write path without an image buffer when keeping the current image", async () => {
    const adminDrinksWriteService = buildService({
      update: vi.fn().mockResolvedValue({
        kind: "success",
        drinkSlug: "adapter-cocktail",
        notices: [],
      }),
    });

    const redirectResponse = await catchThrownResponse(() =>
      updateAdminDrinkActionAdapter({
        request: buildUpdateRequest(),
        slug: "old-fashioned",
        adminDrinksWriteService,
      }),
    );

    expect(redirectResponse).toMatchObject({ status: 302 });
    expect(redirectResponse.headers.get("Location")).toBe("/admin/drinks");
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

    await expect(readToastFromResponse(redirectResponse)).resolves.toEqual({
      kind: "success",
      message: "Drink updated!",
    });
  });

  test("preserves all typed update field errors from the admin write path", async () => {
    const adminDrinksWriteService = buildService({
      update: vi.fn().mockResolvedValue({
        kind: "fieldError",
        fieldErrors: {
          slug: ["Slug already exists"],
          title: ["Title is invalid"],
        },
        formErrors: ["Drink could not be updated"],
      }),
    });

    const response = await updateAdminDrinkActionAdapter({
      request: buildUpdateRequest({ slug: "test-margarita" }),
      slug: "old-fashioned",
      adminDrinksWriteService,
    });

    expect(response).toMatchObject({
      data: {
        fieldErrors: {
          slug: ["Slug already exists"],
          title: ["Title is invalid"],
        },
        formErrors: ["Drink could not be updated"],
      },
      init: { status: 400 },
    });
  });

  test("translates typed missing update targets into not-found responses", async () => {
    const adminDrinksWriteService = buildService({
      update: vi.fn().mockResolvedValue({ kind: "notFound", slug: "missing-drink" }),
    });

    const response = await catchThrownResponse(() =>
      updateAdminDrinkActionAdapter({
        request: buildUpdateRequest(),
        slug: "missing-drink",
        adminDrinksWriteService,
      }),
    );

    expect(response.status).toBe(404);
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

    const redirectResponse = await catchThrownResponse(() =>
      updateAdminDrinkActionAdapter({
        request: buildUpdateRequest({
          imageFile: new File(["replacement-image"], "drink.png", { type: "image/png" }),
        }),
        slug: "old-fashioned",
        adminDrinksWriteService,
      }),
    );

    expect(adminDrinksWriteService.update).toHaveBeenCalledWith(
      expect.objectContaining({ imageBuffer: Buffer.from("replacement-image") }),
    );

    await expect(readToastFromResponse(redirectResponse)).resolves.toEqual({
      kind: "warning",
      message: "Drink updated, but old image cleanup failed",
    });
  });
});
