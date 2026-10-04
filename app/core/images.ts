import { transform, type ImageKitOperations } from "unpic/providers/imagekit";
import type { ImageFormat } from "unpic/types";

export function isImageKitUrl(source: string): boolean {
  return source.startsWith("https://ik.imagekit.io/");
}

export function imagekitTransformer(source: string | URL, operations: ImageKitOperations): string {
  const sourceUrl = source.toString();
  return isImageKitUrl(sourceUrl) ? transform(sourceUrl, operations) : sourceUrl;
}

export function imageUrl(
  source: string,
  width: number,
  format?: ImageFormat,
  height = width,
  quality?: number,
): string {
  return imagekitTransformer(source, { width, height, format, quality });
}
