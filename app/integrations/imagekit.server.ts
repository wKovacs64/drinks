import { ImageKit, toFile } from "@imagekit/nodejs";
import { getEnvVars } from "#/app/core/env.server";

type UploadResult = {
  url: string;
  fileId: string;
};

function getImageKit() {
  const { IMAGEKIT_PRIVATE_KEY } = getEnvVars();
  return new ImageKit({
    privateKey: IMAGEKIT_PRIVATE_KEY,
  });
}

export async function uploadImage(file: Buffer, fileName: string): Promise<UploadResult> {
  const imagekit = getImageKit();

  const response = await imagekit.files.upload({
    file: await toFile(file, fileName),
    fileName,
    folder: "/drinks",
  });

  if (!response.url || !response.fileId) {
    throw new Error("ImageKit upload failed: missing url or fileId in response");
  }

  return {
    url: response.url,
    fileId: response.fileId,
  };
}

export async function deleteImage(fileId: string): Promise<void> {
  const imagekit = getImageKit();
  await imagekit.files.delete(fileId);
}
