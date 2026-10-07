import { mkdir, unlink, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { ImageKit, toFile } from "@imagekit/nodejs";
import { getEnvVars } from "#/app/core/env.ts";
const localImagePrefix = "local:";

function getImageKit() {
  return new ImageKit({ privateKey: getEnvVars().IMAGEKIT_PRIVATE_KEY });
}
export async function uploadImage(
  file: Buffer,
  fileName: string,
): Promise<{ url: string; fileId: string }> {
  // Local test drives never upload to the production ImageKit library.
  if (getEnvVars().NODE_ENV === "development") {
    await mkdir("public/uploads", { recursive: true });
    const id = randomUUID();
    const filename = `${id}-${fileName}`;
    await writeFile(`public/uploads/${filename}`, file);
    return { url: `/uploads/${filename}`, fileId: `${localImagePrefix}${filename}` };
  }
  const response = await getImageKit().files.upload({
    file: await toFile(file, fileName),
    fileName,
    folder: "/drinks",
  });
  if (!response.url || !response.fileId)
    throw new Error("ImageKit upload failed: missing url or fileId");
  return { url: response.url, fileId: response.fileId };
}
export async function deleteImage(fileId: string): Promise<void> {
  if (fileId.startsWith(localImagePrefix)) {
    await unlink(`public/uploads/${fileId.slice(localImagePrefix.length)}`);
    return;
  }
  if (getEnvVars().NODE_ENV === "development") return;
  await getImageKit().files.delete(fileId);
}
