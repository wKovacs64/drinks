import { FormDataParseError, parseFormData, type FileUpload } from '@remix-run/form-data-parser';

const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

type ImageUpload = {
  buffer: Buffer;
  contentType: string;
};

type ParseImageUploadResult = {
  formData: FormData;
  imageUpload: ImageUpload | undefined;
  imageError: string | undefined;
};

export async function parseImageUpload(request: Request): Promise<ParseImageUploadResult> {
  let imageUpload: ImageUpload | undefined;

  async function uploadHandler(fileUpload: FileUpload) {
    if (fileUpload.fieldName === 'imageFile') {
      imageUpload = {
        buffer: Buffer.from(await fileUpload.bytes()),
        contentType: fileUpload.type,
      };
    }
  }

  let formData: FormData;
  try {
    formData = await parseFormData(request, { maxFileSize: MAX_IMAGE_SIZE }, uploadHandler);
  } catch (error) {
    if (error instanceof FormDataParseError) {
      const isFileTooLarge =
        error.cause instanceof Error && error.cause.name === 'MaxFileSizeExceededError';
      return {
        formData: new FormData(),
        imageUpload: undefined,
        imageError: isFileTooLarge ? 'Image must be under 5MB' : 'Failed to process image upload',
      };
    }
    throw error;
  }

  if (imageUpload && !ALLOWED_IMAGE_TYPES.includes(imageUpload.contentType)) {
    return {
      formData,
      imageUpload: undefined,
      imageError: 'Image must be a JPEG, PNG, WebP, or GIF',
    };
  }

  return { formData, imageUpload, imageError: undefined };
}
