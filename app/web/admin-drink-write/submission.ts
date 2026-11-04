import {
  FormDataParseError,
  MaxFileSizeExceededError,
  MaxFilesExceededError,
  MaxHeaderSizeExceededError,
  MaxPartsExceededError,
  MaxTotalSizeExceededError,
  parseFormData,
  type FileUpload,
} from "remix/form-data-parser";

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

type DrinkImageUpload = {
  buffer: Buffer;
  contentType: string;
};

export type DrinkSubmissionResult =
  | { kind: "invalid"; formData?: FormData; errors: string[] }
  | { kind: "ready"; formData: FormData; imageUpload: DrinkImageUpload | undefined };

export async function parseDrinkSubmission(request: Request): Promise<DrinkSubmissionResult> {
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
    // Limit errors are thrown directly rather than wrapped in FormDataParseError.
    // See node_modules/remix/src/form-data-parser/README.md
    if (error instanceof MaxFileSizeExceededError) return invalid("Image must be under 5MB");
    if (error instanceof MaxFilesExceededError) return invalid("Upload only one image");
    if (error instanceof MaxTotalSizeExceededError) return invalid("Form submission is too large");
    if (error instanceof MaxPartsExceededError)
      return invalid("Form submission contains too many fields");
    if (error instanceof MaxHeaderSizeExceededError)
      return invalid("Image upload metadata is too large");
    if (error instanceof FormDataParseError) return invalid("Failed to process image upload");
    throw error;
  }

  if (imageUpload && !ALLOWED_IMAGE_TYPES.includes(imageUpload.contentType)) {
    return invalid("Image must be a JPEG, PNG, WebP, or GIF", formData);
  }

  return { kind: "ready", formData, imageUpload };
}

function invalid(message: string, formData?: FormData): DrinkSubmissionResult {
  return { kind: "invalid", formData, errors: [message] };
}
