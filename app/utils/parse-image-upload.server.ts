import { parseFormData, type FileUpload } from '@remix-run/form-data-parser';

const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export type ImageUpload = {
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

  const formData = await parseFormData(request, uploadHandler);

  if (imageUpload) {
    if (imageUpload.buffer.length > MAX_IMAGE_SIZE) {
      return { formData, imageUpload: undefined, imageError: 'Image must be under 5MB' };
    }
    if (!ALLOWED_IMAGE_TYPES.includes(imageUpload.contentType)) {
      return {
        formData,
        imageUpload: undefined,
        imageError: 'Image must be a JPEG, PNG, WebP, or GIF',
      };
    }
  }

  return { formData, imageUpload, imageError: undefined };
}
