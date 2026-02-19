import { ImageKit, toFile } from '@imagekit/nodejs';
import { getEnvVars } from '#/app/utils/env.server';

const { IMAGEKIT_PRIVATE_KEY, NODE_ENV } = getEnvVars();

type UploadResult = {
  url: string;
  fileId: string;
};

function getImageKit() {
  return new ImageKit({
    privateKey: IMAGEKIT_PRIVATE_KEY,
  });
}

async function uploadImage(file: Buffer, fileName: string): Promise<UploadResult> {
  const imagekit = getImageKit();

  const response = await imagekit.files.upload({
    file: await toFile(file, fileName),
    fileName,
    folder: '/drinks',
  });

  if (!response.url || !response.fileId) {
    throw new Error('ImageKit upload failed: missing url or fileId in response');
  }

  return {
    url: response.url,
    fileId: response.fileId,
  };
}

export async function deleteImage(fileId: string): Promise<void> {
  if (NODE_ENV === 'test') {
    // Skip actual deletion in tests
    return;
  }
  const imagekit = getImageKit();
  await imagekit.files.delete(fileId);
}

/**
 * For tests: return placeholder values instead of uploading.
 */
export async function uploadImageOrPlaceholder(
  file: Buffer,
  fileName: string,
): Promise<UploadResult> {
  if (NODE_ENV === 'test') {
    return {
      url: `https://via.placeholder.com/400x400.png?text=${encodeURIComponent(fileName)}`,
      fileId: 'test-placeholder',
    };
  }
  return uploadImage(file, fileName);
}
