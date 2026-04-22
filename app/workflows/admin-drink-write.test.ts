import { beforeEach, describe, expect, test, vi } from "vitest";
import { getToast } from "#/app/core/toast.server";
import { routeAction } from "#/app/core/route-action.server";
import { getDb } from "#/app/db/client.server";
import { resetAndSeedDatabase } from "#/app/db/reset.server";
import { createDrinksService } from "#/app/modules/drinks/drinks.server";
import { createAdminDrinkWriteWorkflow } from "./admin-drink-write.server";

function buildDrinkFormRequest(
  overrides: {
    imageFile?: File;
    url?: string;
  } = {},
) {
  const formData = new FormData();
  formData.set("title", "Workflow Cocktail");
  formData.set("slug", "workflow-cocktail");
  formData.set("ingredients", "gin\ntonic");
  formData.set("calories", "150");
  formData.set("tags", "gin, refreshing");
  formData.set("notes", "Built in workflow tests");
  formData.set("rank", "0");
  formData.set("status", "published");

  if (overrides.imageFile) {
    formData.set("imageFile", overrides.imageFile);
  }

  return new Request(overrides.url ?? "http://test.local/admin/drinks/new", {
    method: "POST",
    body: formData,
  });
}

function testWorkflow(
  overrides: Partial<Parameters<typeof createAdminDrinkWriteWorkflow>[0]> = {},
) {
  return createAdminDrinkWriteWorkflow({
    db: getDb(),
    uploadImage: vi.fn().mockResolvedValue({
      url: "https://ik.imagekit.io/test/drinks/workflow-cocktail.jpg",
      fileId: "workflow-file-id",
    }),
    deleteImage: vi.fn().mockResolvedValue(undefined),
    purgeDrinkCache: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  });
}

async function catchRedirect(fn: () => Promise<unknown>): Promise<Response> {
  try {
    await fn();
    throw new Error("Expected a redirect Response to be thrown");
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

describe("createAdminDrinkWriteWorkflow", () => {
  test("prepareCreate returns imageFile field errors when image is missing", async () => {
    const workflow = testWorkflow();

    const result = await workflow.prepareCreate({
      request: buildDrinkFormRequest(),
    });

    expect(result).toEqual({
      kind: "invalid",
      fieldErrors: {
        imageFile: ["Image is required"],
      },
      formErrors: [],
      status: 400,
    });
  });

  test("prepareUpdate is ready when no replacement image is uploaded", async () => {
    const workflow = testWorkflow();

    const result = await workflow.prepareUpdate({
      request: buildDrinkFormRequest({
        url: "http://test.local/admin/drinks/test-margarita/edit",
      }),
      slug: "test-margarita",
    });

    expect(result.kind).toBe("ready");
  });

  test("prepareCreate returns imageFile field errors for unsupported image types", async () => {
    const workflow = testWorkflow();

    const result = await workflow.prepareCreate({
      request: buildDrinkFormRequest({
        imageFile: new File(["not-an-image"], "bad.txt", { type: "text/plain" }),
      }),
    });

    expect(result).toEqual({
      kind: "invalid",
      fieldErrors: {
        imageFile: ["Image must be a JPEG, PNG, WebP, or GIF"],
      },
      formErrors: [],
      status: 400,
    });
  });

  test("prepareCreate returns a ready intent that routeAction can execute", async () => {
    const workflow = testWorkflow();
    const request = buildDrinkFormRequest({
      imageFile: new File(["fake-image"], "workflow-cocktail.png", { type: "image/png" }),
    });

    const result = await workflow.prepareCreate({ request });

    expect(result.kind).toBe("ready");
    if (result.kind !== "ready") {
      return;
    }

    const response = await catchRedirect(() => routeAction(request, result.intent));

    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toBe("/admin/drinks");

    const { toast } = await getToast(
      new Request("http://test.local/admin", {
        headers: { Cookie: response.headers.get("Set-Cookie")! },
      }),
    );
    expect(toast).toEqual({ kind: "success", message: "Drink created!" });

    const drinksService = createDrinksService({ db: getDb() });
    const editor = await drinksService.getDrinkEditorBySlug("workflow-cocktail");
    expect(editor.initialValues.title).toBe("Workflow Cocktail");
  });

  test("prepareUpdate returns a warning toast when old image cleanup fails", async () => {
    const workflow = testWorkflow({
      uploadImage: vi.fn().mockResolvedValue({
        url: "https://ik.imagekit.io/test/drinks/test-margarita.jpg",
        fileId: "replacement-file-id",
      }),
      deleteImage: vi.fn().mockRejectedValue(new Error("cleanup failed")),
    });
    const request = buildDrinkFormRequest({
      url: "http://test.local/admin/drinks/test-margarita/edit",
      imageFile: new File(["replacement-image"], "test-margarita.png", { type: "image/png" }),
    });

    const result = await workflow.prepareUpdate({
      request,
      slug: "test-margarita",
    });

    expect(result.kind).toBe("ready");
    if (result.kind !== "ready") {
      return;
    }

    const response = await catchRedirect(() => routeAction(request, result.intent));

    const { toast } = await getToast(
      new Request("http://test.local/admin", {
        headers: { Cookie: response.headers.get("Set-Cookie")! },
      }),
    );
    expect(toast).toEqual({
      kind: "warning",
      message: "Drink updated, but old image cleanup failed",
    });

    const drinksService = createDrinksService({ db: getDb() });
    const editor = await drinksService.getDrinkEditorBySlug("workflow-cocktail");
    expect(editor.initialValues.title).toBe("Workflow Cocktail");
  });

  test("prepareDelete returns an intent that deletes the drink", async () => {
    const workflow = testWorkflow();
    const request = new Request("http://test.local/admin/drinks/test-margarita/delete", {
      method: "POST",
    });

    const deleteIntent = await workflow.prepareDelete({ slug: "test-margarita" });
    const response = await catchRedirect(() => routeAction(request, deleteIntent));

    expect(response.headers.get("Location")).toBe("/admin/drinks");

    const { toast } = await getToast(
      new Request("http://test.local/admin", {
        headers: { Cookie: response.headers.get("Set-Cookie")! },
      }),
    );
    expect(toast).toEqual({ kind: "success", message: "Drink deleted!" });

    await expect(
      createDrinksService({ db: getDb() }).getDrinkEditorBySlug("test-margarita"),
    ).rejects.toThrowError('Drink not found for slug "test-margarita"');
  });
});
