import { describe, expect, expectTypeOf, test } from "vitest";
import {
  parseCreateDrinkSubmission,
  parseUpdateDrinkSubmission,
} from "./admin-drink-submission.server";

function buildDrinkFormRequest(
  overrides: {
    imageFile?: File;
  } = {},
) {
  const formData = new FormData();
  formData.set("title", "Parsed Cocktail");
  formData.set("slug", "parsed-cocktail");
  formData.set("ingredients", "gin\ntonic");
  formData.set("calories", "150");
  formData.set("tags", "gin, refreshing");
  formData.set("notes", "Built in parser tests");
  formData.set("rank", "0");
  formData.set("status", "published");

  if (overrides.imageFile) {
    formData.set("imageFile", overrides.imageFile);
  }

  return new Request("http://test.local/admin/drinks/new", {
    method: "POST",
    body: formData,
  });
}

describe("drink submission parsing", () => {
  test("create submissions require an image", async () => {
    const result = await parseCreateDrinkSubmission(buildDrinkFormRequest());

    expect(result).toEqual({
      kind: "invalid",
      fieldErrors: {
        imageFile: ["Image is required"],
      },
      formErrors: [],
      status: 400,
    });
  });

  test("update submissions allow keeping the current image", async () => {
    const result = await parseUpdateDrinkSubmission(buildDrinkFormRequest());

    expect(result.kind).toBe("ready");
    if (result.kind !== "ready") {
      return;
    }
    expect(result.imageUpload).toBeUndefined();
    expect(result.formData.get("title")).toBe("Parsed Cocktail");
  });

  test.each([
    ["create", parseCreateDrinkSubmission],
    ["update", parseUpdateDrinkSubmission],
  ])(
    "%s submissions with unsupported image types return an imageFile field error",
    async (_, parse) => {
      const result = await parse(
        buildDrinkFormRequest({
          imageFile: new File(["not-an-image"], "bad.txt", { type: "text/plain" }),
        }),
      );

      expect(result).toEqual({
        kind: "invalid",
        fieldErrors: {
          imageFile: ["Image must be a JPEG, PNG, WebP, or GIF"],
        },
        formErrors: [],
        status: 400,
      });
    },
  );

  test.each([
    ["create", parseCreateDrinkSubmission],
    ["update", parseUpdateDrinkSubmission],
  ])(
    "%s submissions with oversized image uploads return an imageFile field error",
    async (_, parse) => {
      const oversizedBytes = new Uint8Array(5 * 1024 * 1024 + 1);

      const result = await parse(
        buildDrinkFormRequest({
          imageFile: new File([oversizedBytes], "large.png", { type: "image/png" }),
        }),
      );

      expect(result).toEqual({
        kind: "invalid",
        fieldErrors: {
          imageFile: ["Image must be under 5MB"],
        },
        formErrors: [],
        status: 400,
      });
    },
  );

  test("valid submissions return form data and image upload data without validating drink draft fields", async () => {
    const request = buildDrinkFormRequest({
      imageFile: new File(["fake-image"], "parsed-cocktail.png", { type: "image/png" }),
    });
    const formData = await request.formData();
    formData.set("calories", "not a number");

    const result = await parseCreateDrinkSubmission(
      new Request(request.url, { method: "POST", body: formData }),
    );

    expect(result.kind).toBe("ready");
    if (result.kind !== "ready") {
      return;
    }
    expect(result.formData.get("title")).toBe("Parsed Cocktail");
    expect(result.formData.get("calories")).toBe("not a number");
    expectTypeOf(result.imageUpload).toEqualTypeOf<{ buffer: Buffer; contentType: string }>();
    expect(result.imageUpload).toEqual({
      buffer: Buffer.from("fake-image"),
      contentType: "image/png",
    });
  });
});
