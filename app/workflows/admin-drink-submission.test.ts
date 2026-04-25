import { describe, expect, test } from "vitest";
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
    expect(result.draft.title).toBe("Parsed Cocktail");
  });

  test("unsupported image types return an imageFile field error", async () => {
    const result = await parseCreateDrinkSubmission(
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
  });

  test("oversized image uploads return an imageFile field error", async () => {
    const oversizedBytes = new Uint8Array(5 * 1024 * 1024 + 1);

    const result = await parseCreateDrinkSubmission(
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
  });

  test("valid submissions return normalized draft data and image upload data", async () => {
    const result = await parseCreateDrinkSubmission(
      buildDrinkFormRequest({
        imageFile: new File(["fake-image"], "parsed-cocktail.png", { type: "image/png" }),
      }),
    );

    expect(result.kind).toBe("ready");
    if (result.kind !== "ready") {
      return;
    }
    expect(result.draft).toMatchObject({
      title: "Parsed Cocktail",
      slug: "parsed-cocktail",
      ingredients: ["gin", "tonic"],
      calories: 150,
      tags: ["gin", "refreshing"],
      rank: 0,
      status: "published",
    });
    expect(result.formData.get("title")).toBe("Parsed Cocktail");
    expect(result.imageUpload).toEqual({
      buffer: Buffer.from("fake-image"),
      contentType: "image/png",
    });
  });
});
