import {
  FormDataParseError,
  MaxFilesExceededError,
  parseFormData,
  type FileUpload,
} from "remix/form-data-parser";
import {
  MaxFileSizeExceededError,
  MaxHeaderSizeExceededError,
  MaxPartsExceededError,
  MaxTotalSizeExceededError,
} from "remix/multipart-parser";

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

type DrinkImageUpload = {
  buffer: Buffer;
  contentType: string;
};

type DrinkSubmissionInvalidResult = {
  kind: "invalid";
  formData?: FormData;
  fieldErrors: Record<string, string[] | undefined>;
  formErrors: string[];
  status: 400;
};

type DrinkSubmissionReadyResult = {
  kind: "ready";
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
    return imageFieldError("Image is required", result.formData);
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

  return {
    kind: "ready",
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
    if (fileUpload.fieldName !== "imageFile" || !fileUpload.name) {
      return null;
    }

    imageUpload = {
      buffer: Buffer.from(await fileUpload.bytes()),
      contentType: fileUpload.type,
    };
    return fileUpload.name;
  }

  let formData: FormData;
  try {
    formData = await parseFormData(
      request,
      {
        maxFiles: 1,
        maxParts: 16,
        maxFileSize: MAX_IMAGE_SIZE,
        maxTotalSize: MAX_IMAGE_SIZE + 256 * 1024,
        maxHeaderSize: 8 * 1024,
      },
      uploadHandler,
    );
  } catch (error) {
    const parseError = error instanceof FormDataParseError && error.cause ? error.cause : error;
    if (parseError instanceof MaxFileSizeExceededError) {
      return imageFieldError("Image must be under 5MB");
    }
    if (parseError instanceof MaxFilesExceededError)
      return imageFieldError("Upload only one image");
    if (parseError instanceof MaxTotalSizeExceededError)
      return imageFieldError("Form submission is too large");
    if (parseError instanceof MaxPartsExceededError)
      return imageFieldError("Form submission contains too many fields");
    if (parseError instanceof MaxHeaderSizeExceededError)
      return imageFieldError("Image upload metadata is too large");

    if (error instanceof FormDataParseError) {
      return imageFieldError("Failed to process image upload");
    }
    throw error;
  }

  if (imageUpload && !ALLOWED_IMAGE_TYPES.includes(imageUpload.contentType)) {
    return imageFieldError("Image must be a JPEG, PNG, WebP, or GIF", formData);
  }

  return { kind: "ready", formData, imageUpload };
}

function imageFieldError(message: string, formData?: FormData): DrinkSubmissionInvalidResult {
  return {
    kind: "invalid",
    formData,
    fieldErrors: {
      imageFile: [message],
    },
    formErrors: [],
    status: 400,
  };
}
