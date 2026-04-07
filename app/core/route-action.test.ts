import { describe, expect, test, vi } from "vitest";
import { z } from "zod";
import { DomainError, FieldDomainError, FormDomainError } from "./errors";
import { intent, routeAction } from "./route-action.server";
import { getToast } from "./toast.server";

const testSchema = z.object({
  name: z.string().min(1, "Required"),
});

function buildFormRequest(entries: Record<string, string>): Request {
  const formData = new FormData();

  for (const [key, value] of Object.entries(entries)) {
    formData.set(key, value);
  }

  return new Request("http://test.local/action", {
    method: "POST",
    body: formData,
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

function unwrapData(result: { data: unknown; init?: ResponseInit | null }) {
  return {
    body: result.data,
    status: result.init?.status ?? 200,
    headers: new Headers(result.init?.headers),
  };
}

describe("routeAction", () => {
  test("throws redirect with toast on single-intent happy path", async () => {
    const operation = vi.fn().mockResolvedValue({ id: "123" });

    const response = await catchRedirect(() =>
      routeAction(
        buildFormRequest({ name: "Test Item" }),
        intent({
          schema: testSchema,
          operation,
          redirectTo: "/items",
          toast: { successMessage: "Item created" },
        }),
      ),
    );

    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toBe("/items");
    expect(operation).toHaveBeenCalledWith({ name: "Test Item" });

    const { toast } = await getToast(
      new Request("http://test.local/", {
        headers: { Cookie: response.headers.get("Set-Cookie")! },
      }),
    );
    expect(toast).toEqual({ kind: "success", message: "Item created" });
  });

  test("returns 400 with field errors on validation failure", async () => {
    const operation = vi.fn();

    const result = unwrapData(
      await routeAction(
        buildFormRequest({ name: "" }),
        intent({
          schema: testSchema,
          operation,
          redirectTo: "/items",
          toast: { successMessage: "Item created" },
        }),
      ),
    );

    expect(result.status).toBe(400);
    expect(result.body).toEqual({
      fieldErrors: { name: ["Required"] },
      formErrors: [],
    });
    expect(operation).not.toHaveBeenCalled();
  });

  test("returns 400 with field error when operation throws FieldDomainError", async () => {
    const operation = vi.fn().mockRejectedValue(new FieldDomainError("name", "Already exists"));

    const result = unwrapData(
      await routeAction(
        buildFormRequest({ name: "Taken Name" }),
        intent({
          schema: testSchema,
          operation,
          redirectTo: "/items",
          toast: { successMessage: "Item created" },
        }),
      ),
    );

    expect(result.status).toBe(400);
    expect(result.body).toMatchObject({
      fieldErrors: { name: ["Already exists"] },
      formErrors: [],
    });
  });

  test("returns 400 with form-level error when operation throws FormDomainError", async () => {
    const operation = vi.fn().mockRejectedValue(new FormDomainError("Has items"));

    const result = unwrapData(
      await routeAction(
        buildFormRequest({ name: "Category" }),
        intent({
          schema: testSchema,
          operation,
          redirectTo: "/items",
          toast: { successMessage: "Deleted" },
        }),
      ),
    );

    expect(result.status).toBe(400);
    expect(result.body).toMatchObject({
      fieldErrors: {},
      formErrors: ["Has items"],
    });
  });

  test("rethrows unknown errors from the operation", async () => {
    const operation = vi.fn().mockRejectedValue(new Error("DB connection failed"));

    await expect(
      routeAction(
        buildFormRequest({ name: "Test" }),
        intent({
          schema: testSchema,
          operation,
          redirectTo: "/items",
          toast: { successMessage: "Created" },
        }),
      ),
    ).rejects.toThrow("DB connection failed");
  });

  test("dispatches correct intent in multi-intent scenario", async () => {
    const updateOperation = vi.fn().mockResolvedValue({ id: "1" });
    const deleteOperation = vi.fn().mockResolvedValue(undefined);

    const response = await catchRedirect(() =>
      routeAction(buildFormRequest({ name: "Updated", intent: "update" }), {
        update: intent({
          schema: testSchema,
          operation: updateOperation,
          redirectTo: "/items",
          toast: { successMessage: "Updated" },
        }),
        delete: intent({
          operation: deleteOperation,
          redirectTo: "/items",
          toast: { successMessage: "Deleted" },
        }),
      }),
    );

    expect(response.status).toBe(302);
    expect(updateOperation).toHaveBeenCalledWith({ name: "Updated" });
    expect(deleteOperation).not.toHaveBeenCalled();
  });

  test("returns 400 for invalid intent in multi-intent scenario", async () => {
    const result = unwrapData(
      await routeAction(buildFormRequest({ intent: "bogus" }), {
        update: intent({
          schema: testSchema,
          operation: vi.fn(),
          redirectTo: "/items",
          toast: { successMessage: "Updated" },
        }),
        delete: intent({
          operation: vi.fn(),
          redirectTo: "/items",
          toast: { successMessage: "Deleted" },
        }),
      }),
    );

    expect(result.status).toBe(400);
    expect(result.body).toEqual({
      fieldErrors: {},
      formErrors: ['Invalid intent "bogus"'],
    });
  });

  test("includes actionIntent in multi-intent error responses", async () => {
    const operation = vi.fn().mockRejectedValue(new FieldDomainError("name", "Taken"));

    const result = unwrapData(
      await routeAction(buildFormRequest({ name: "Taken", intent: "update" }), {
        update: intent({
          schema: testSchema,
          operation,
          redirectTo: "/items",
          toast: { successMessage: "Updated" },
        }),
        delete: intent({
          operation: vi.fn(),
          redirectTo: "/items",
          toast: { successMessage: "Deleted" },
        }),
      }),
    );

    expect(result.status).toBe(400);
    expect(result.body).toMatchObject({
      actionIntent: "update",
      fieldErrors: { name: ["Taken"] },
      formErrors: [],
    });
  });

  test("calls schema-less operation with no args", async () => {
    const operation = vi.fn().mockResolvedValue(undefined);

    const response = await catchRedirect(() =>
      routeAction(
        buildFormRequest({}),
        intent({
          operation,
          redirectTo: "/items",
          toast: { successMessage: "Deleted" },
        }),
      ),
    );

    expect(response.status).toBe(302);
    expect(operation).toHaveBeenCalledWith();
  });

  test("toast: {} is a compile-time error", () => {
    const emptyToast = {} as const;

    intent({
      operation: vi.fn().mockResolvedValue(undefined),
      redirectTo: "/items",
      // @ts-expect-error empty toast should be rejected
      toast: emptyToast,
    });
  });

  test("navigating intent without toast produces plain redirect", async () => {
    const operation = vi.fn().mockResolvedValue(undefined);

    const response = await catchRedirect(() =>
      routeAction(
        buildFormRequest({}),
        intent({
          operation,
          redirectTo: "/items",
        }),
      ),
    );

    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toBe("/items");
    expect(response.headers.get("Set-Cookie")).toBeNull();
  });

  test("navigating intent with toast.successMessage redirects with toast", async () => {
    const operation = vi.fn().mockResolvedValue({ id: "1" });

    const response = await catchRedirect(() =>
      routeAction(
        buildFormRequest({ name: "Test" }),
        intent({
          schema: testSchema,
          operation,
          redirectTo: "/items",
          toast: { successMessage: "Created!" },
        }),
      ),
    );

    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toBe("/items");

    const { toast } = await getToast(
      new Request("http://test.local/", {
        headers: { Cookie: response.headers.get("Set-Cookie")! },
      }),
    );
    expect(toast).toEqual({ kind: "success", message: "Created!" });
  });

  test("navigating intent with toast as function redirects with toast from operation result", async () => {
    const operation = vi.fn(async () => ({ needsWarning: true as boolean }));

    const response = await catchRedirect(() =>
      routeAction(
        buildFormRequest({ name: "Test" }),
        intent({
          schema: testSchema,
          operation,
          redirectTo: "/items",
          toast: (operationResult) => {
            if (operationResult instanceof DomainError) {
              return { kind: "error", message: operationResult.message };
            }
            return operationResult.needsWarning
              ? { kind: "warning", message: "Saved with caveats" }
              : { kind: "success", message: "Saved" };
          },
        }),
      ),
    );

    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toBe("/items");

    const { toast } = await getToast(
      new Request("http://test.local/", {
        headers: { Cookie: response.headers.get("Set-Cookie")! },
      }),
    );
    expect(toast).toEqual({ kind: "warning", message: "Saved with caveats" });
  });

  test("function toast returning undefined on success suppresses toast", async () => {
    const response = await catchRedirect(() =>
      routeAction(
        buildFormRequest({ name: "Test" }),
        intent({
          schema: testSchema,
          operation: vi.fn().mockResolvedValue({ id: "1" }),
          redirectTo: "/items",
          toast: () => undefined,
        }),
      ),
    );

    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toBe("/items");
    expect(response.headers.get("Set-Cookie")).toBeNull();
  });

  test("function toast receives DomainError on FieldDomainError", async () => {
    const toastFn = vi.fn((operationResult: unknown) => {
      if (operationResult instanceof DomainError) {
        return { kind: "error" as const, message: `Failed: ${operationResult.message}` };
      }
      return { kind: "success" as const, message: "Created" };
    });

    const result = unwrapData(
      await routeAction(
        buildFormRequest({ name: "Taken" }),
        intent({
          schema: testSchema,
          operation: vi.fn().mockRejectedValue(new FieldDomainError("name", "Already exists")),
          redirectTo: "/items",
          toast: toastFn,
        }),
      ),
    );

    expect(toastFn).toHaveBeenCalledWith(expect.any(FieldDomainError));
    expect(result.status).toBe(400);
    expect(result.body).toMatchObject({
      fieldErrors: { name: ["Already exists"] },
      formErrors: [],
    });

    const { toast } = await getToast(
      new Request("http://test.local/", {
        headers: { Cookie: result.headers.get("Set-Cookie")! },
      }),
    );
    expect(toast).toEqual({ kind: "error", message: "Failed: Already exists" });
  });

  test("function toast returning undefined on error suppresses toast", async () => {
    const result = unwrapData(
      await routeAction(
        buildFormRequest({ name: "Taken" }),
        intent({
          schema: testSchema,
          operation: vi.fn().mockRejectedValue(new FieldDomainError("name", "Already exists")),
          redirectTo: "/items",
          toast: (operationResult) => {
            if (operationResult instanceof DomainError) return undefined;
            return { kind: "success", message: "Created" };
          },
        }),
      ),
    );

    expect(result.status).toBe(400);
    expect(result.body).toMatchObject({
      fieldErrors: { name: ["Already exists"] },
    });
    expect(result.headers.get("Set-Cookie")).toBeNull();
  });

  test("non-navigating success returns data payload", async () => {
    const operation = vi.fn().mockResolvedValue({ id: "discarded" });

    const result = unwrapData(
      await routeAction(
        buildFormRequest({ name: "Test Item" }),
        intent({
          schema: testSchema,
          operation,
        }),
      ),
    );

    expect(result.status).toBe(200);
    expect(result.body).toEqual({
      fieldErrors: {},
      formErrors: [],
    });
    expect(operation).toHaveBeenCalledWith({ name: "Test Item" });
  });

  test("non-navigating + toast.successMessage sets toast cookie", async () => {
    const operation = vi.fn().mockResolvedValue(undefined);

    const result = unwrapData(
      await routeAction(
        buildFormRequest({ name: "Test" }),
        intent({
          schema: testSchema,
          operation,
          toast: { successMessage: "Saved!" },
        }),
      ),
    );

    expect(result.headers.get("Set-Cookie")).toContain("__toast");

    const { toast } = await getToast(
      new Request("http://test.local/", {
        headers: { Cookie: result.headers.get("Set-Cookie")! },
      }),
    );
    expect(toast).toEqual({ kind: "success", message: "Saved!" });
  });

  test("non-navigating intent with function toast sets toast cookie", async () => {
    const operation = vi.fn().mockResolvedValue({ count: 3 });

    const result = unwrapData(
      await routeAction(
        buildFormRequest({ name: "Test" }),
        intent({
          schema: testSchema,
          operation,
          toast: () => ({ kind: "success", message: "Saved" }),
        }),
      ),
    );

    expect(result.headers.get("Set-Cookie")).toContain("__toast");

    const { toast } = await getToast(
      new Request("http://test.local/", {
        headers: { Cookie: result.headers.get("Set-Cookie")! },
      }),
    );
    expect(toast).toEqual({ kind: "success", message: "Saved" });
  });

  test("non-navigating without toast produces no Set-Cookie header", async () => {
    const operation = vi.fn().mockResolvedValue(undefined);

    const result = unwrapData(
      await routeAction(
        buildFormRequest({ name: "Test" }),
        intent({
          schema: testSchema,
          operation,
        }),
      ),
    );

    expect(result.headers.get("Set-Cookie")).toBeNull();
  });

  test("non-navigating intent rethrows unexpected errors", async () => {
    const operation = vi.fn().mockRejectedValue(new Error("DB connection failed"));

    await expect(
      routeAction(
        buildFormRequest({ name: "Test" }),
        intent({
          schema: testSchema,
          operation,
        }),
      ),
    ).rejects.toThrow("DB connection failed");
  });

  test("FieldDomainError + errorMessage: true returns field errors + error toast", async () => {
    const operation = vi.fn().mockRejectedValue(new FieldDomainError("name", "Name already taken"));

    const result = unwrapData(
      await routeAction(
        buildFormRequest({ name: "Taken Name" }),
        intent({
          schema: testSchema,
          operation,
          redirectTo: "/items",
          toast: { successMessage: "Created", errorMessage: true },
        }),
      ),
    );

    expect(result.status).toBe(400);
    expect(result.body).toMatchObject({
      fieldErrors: { name: ["Name already taken"] },
      formErrors: [],
    });

    const { toast } = await getToast(
      new Request("http://test.local/", {
        headers: { Cookie: result.headers.get("Set-Cookie")! },
      }),
    );
    expect(toast).toEqual({ kind: "error", message: "Name already taken" });
  });

  test("FormDomainError + errorMessage static string returns form errors + error toast", async () => {
    const operation = vi.fn().mockRejectedValue(new FormDomainError("Has 3 menu items"));

    const result = unwrapData(
      await routeAction(
        buildFormRequest({ name: "Category" }),
        intent({
          schema: testSchema,
          operation,
          redirectTo: "/items",
          toast: { successMessage: "Deleted", errorMessage: "Unable to delete" },
        }),
      ),
    );

    expect(result.status).toBe(400);
    expect(result.body).toMatchObject({
      fieldErrors: {},
      formErrors: ["Has 3 menu items"],
    });

    const { toast } = await getToast(
      new Request("http://test.local/", {
        headers: { Cookie: result.headers.get("Set-Cookie")! },
      }),
    );
    expect(toast).toEqual({ kind: "error", message: "Unable to delete" });
  });

  test("single-key record triggers multi-intent behavior", async () => {
    const operation = vi.fn().mockResolvedValue(undefined);

    const invalidResult = unwrapData(
      await routeAction(buildFormRequest({ name: "Test" }), {
        create: intent({
          schema: testSchema,
          operation,
          redirectTo: "/items",
        }),
      }),
    );

    expect(invalidResult.status).toBe(400);
    expect(operation).not.toHaveBeenCalled();

    const response = await catchRedirect(() =>
      routeAction(buildFormRequest({ name: "Test", intent: "create" }), {
        create: intent({
          schema: testSchema,
          operation,
          redirectTo: "/items",
        }),
      }),
    );

    expect(response.status).toBe(302);
    expect(operation).toHaveBeenCalledWith({ name: "Test" });
  });

  test("passes operation result to dynamic redirectTo function", async () => {
    const operation = vi.fn().mockResolvedValue({ drinkId: "abc-123" });

    const response = await catchRedirect(() =>
      routeAction(
        buildFormRequest({ name: "New Item" }),
        intent({
          schema: testSchema,
          operation,
          redirectTo: (result: { drinkId: string }) => `/items/${result.drinkId}`,
          toast: { successMessage: "Created" },
        }),
      ),
    );

    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toBe("/items/abc-123");
  });
});
