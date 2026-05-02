import { describe, expect, expectTypeOf, test } from "vitest";
import { parseCreateDrinkSubmission, parseUpdateDrinkSubmission } from "./submission.server";

function buildMultipartRequest(
  overrides: {
    imageFile?: File;
  } = {},
) {
  const formData = new FormData();
  formData.set("caption", "Multipart parser payload");

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
    const result = await parseCreateDrinkSubmission(buildMultipartRequest());

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
    const result = await parseUpdateDrinkSubmission(buildMultipartRequest());

    expect(result.kind).toBe("ready");
    if (result.kind !== "ready") {
      return;
    }
    expect(result.imageUpload).toBeUndefined();
    expect(result.formData.get("caption")).toBe("Multipart parser payload");
  });

  test.each([
    ["create", parseCreateDrinkSubmission],
    ["update", parseUpdateDrinkSubmission],
  ])(
    "%s submissions with unsupported image types return an imageFile field error",
    async (_, parse) => {
      const result = await parse(
        buildMultipartRequest({
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
        buildMultipartRequest({
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

  test("valid create submissions return form data and image upload data", async () => {
    const result = await parseCreateDrinkSubmission(
      buildMultipartRequest({
        imageFile: new File(["fake-image"], "parsed-cocktail.png", { type: "image/png" }),
      }),
    );

    expect(result.kind).toBe("ready");
    if (result.kind !== "ready") {
      return;
    }
    expect(result.formData.get("caption")).toBe("Multipart parser payload");
    expectTypeOf(result.imageUpload).toEqualTypeOf<{ buffer: Buffer; contentType: string }>();
    expect(result.imageUpload).toEqual({
      buffer: Buffer.from("fake-image"),
      contentType: "image/png",
    });
  });
});
