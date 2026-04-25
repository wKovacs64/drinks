import { FormDataParseError, parseFormData, type FileUpload } from "@remix-run/form-data-parser";
import { drinkDraftSchema, type DrinkDraft } from "#/app/modules/drinks/drinks";

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

type DrinkImageUpload = {
  buffer: Buffer;
  contentType: string;
};

type DrinkSubmissionInvalidResult = {
  kind: "invalid";
  fieldErrors: Record<string, string[] | undefined>;
  formErrors: string[];
  status: 400;
};

type DrinkSubmissionReadyResult = {
  kind: "ready";
  draft: DrinkDraft;
  formData: FormData;
  imageUpload: DrinkImageUpload | undefined;
};

type CreateDrinkSubmissionReadyResult = Omit<DrinkSubmissionReadyResult, "imageUpload"> & {
  imageUpload: DrinkImageUpload;
};

export type DrinkSubmissionResult = DrinkSubmissionInvalidResult | DrinkSubmissionReadyResult;
export type CreateDrinkSubmissionResult =
  | DrinkSubmissionInvalidResult
  | CreateDrinkSubmissionReadyResult;

export async function parseCreateDrinkSubmission(
  request: Request,
): Promise<CreateDrinkSubmissionResult> {
  const result = await parseDrinkSubmission(request);
  if (result.kind === "invalid") {
    return result;
  }

  if (!result.imageUpload) {
    return imageFieldError("Image is required");
  }

  return {
    ...result,
    imageUpload: result.imageUpload,
  };
}

export async function parseUpdateDrinkSubmission(request: Request): Promise<DrinkSubmissionResult> {
  return parseDrinkSubmission(request);
}

async function parseDrinkSubmission(request: Request): Promise<DrinkSubmissionResult> {
  const parsedMultipart = await parseMultipartDrinkForm(request);
  if (parsedMultipart.kind === "invalid") {
    return parsedMultipart;
  }

  const draftResult = drinkDraftSchema.safeParse(Object.fromEntries(parsedMultipart.formData));
  if (!draftResult.success) {
    const flattenedError = draftResult.error.flatten();
    return {
      kind: "invalid",
      fieldErrors: flattenedError.fieldErrors,
      formErrors: flattenedError.formErrors,
      status: 400,
    };
  }

  return {
    kind: "ready",
    draft: draftResult.data,
    formData: parsedMultipart.formData,
    imageUpload: parsedMultipart.imageUpload,
  };
}

async function parseMultipartDrinkForm(
  request: Request,
): Promise<
  | { kind: "ready"; formData: FormData; imageUpload: DrinkImageUpload | undefined }
  | DrinkSubmissionInvalidResult
> {
  let imageUpload: DrinkImageUpload | undefined;

  async function uploadHandler(fileUpload: FileUpload) {
    if (fileUpload.fieldName !== "imageFile") {
      return;
    }

    imageUpload = {
      buffer: Buffer.from(await fileUpload.bytes()),
      contentType: fileUpload.type,
    };
  }

  let formData: FormData;
  try {
    formData = await parseFormData(request, { maxFileSize: MAX_IMAGE_SIZE }, uploadHandler);
  } catch (error) {
    if (isMaxFileSizeExceededError(error)) {
      return imageFieldError("Image must be under 5MB");
    }

    if (error instanceof FormDataParseError) {
      return imageFieldError("Failed to process image upload");
    }
    throw error;
  }

  if (imageUpload && !ALLOWED_IMAGE_TYPES.includes(imageUpload.contentType)) {
    return imageFieldError("Image must be a JPEG, PNG, WebP, or GIF");
  }

  return { kind: "ready", formData, imageUpload };
}

function isMaxFileSizeExceededError(error: unknown) {
  if (error instanceof Error && error.name === "MaxFileSizeExceededError") {
    return true;
  }

  return (
    error instanceof FormDataParseError &&
    error.cause instanceof Error &&
    error.cause.name === "MaxFileSizeExceededError"
  );
}

function imageFieldError(message: string): DrinkSubmissionInvalidResult {
  return {
    kind: "invalid",
    fieldErrors: {
      imageFile: [message],
    },
    formErrors: [],
    status: 400,
  };
}
