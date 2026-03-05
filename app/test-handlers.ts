import { http, HttpResponse } from "msw";

// 1x1 transparent WebP (smallest valid WebP)
const TINY_WEBP = new Uint8Array([
  0x52, 0x49, 0x46, 0x46, 0x1a, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50, 0x56, 0x50, 0x38, 0x4c,
  0x0d, 0x00, 0x00, 0x00, 0x2f, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
]);

let uploadCounter = 0;

export const handlers = [
  // ImageKit upload
  http.post("https://upload.imagekit.io/api/v1/files/upload", async ({ request }) => {
    uploadCounter++;
    const formData = await request.formData();
    const fileName = String(formData.get("fileName") ?? `upload-${uploadCounter}`);

    return HttpResponse.json({
      fileId: `test-fileId-${uploadCounter}`,
      name: fileName,
      url: `https://ik.imagekit.io/test/drinks/${fileName}`,
      thumbnailUrl: `https://ik.imagekit.io/test/drinks/tr:n-ik_ml_thumbnail/${fileName}`,
      height: 400,
      width: 400,
      size: 1024,
      filePath: `/drinks/${fileName}`,
      fileType: "image",
    });
  }),

  // ImageKit delete
  http.delete("https://api.imagekit.io/v1/files/:fileId", () => {
    return new HttpResponse(null, { status: 204 });
  }),

  // ImageKit CDN (for blur placeholder generation via unpic)
  http.get("https://ik.imagekit.io/*", () => {
    return new HttpResponse(TINY_WEBP, {
      headers: { "Content-Type": "image/webp" },
    });
  }),

  // Fastly cache purge (safety net — env vars are unpopulated in test,
  // so this only fires if someone explicitly configures them)
  http.post("https://api.fastly.com/service/:serviceId/purge", () => {
    return HttpResponse.json({ status: "ok" });
  }),
];
