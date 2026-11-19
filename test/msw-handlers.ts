import { http, HttpResponse } from "msw/http";
import { passthrough } from "msw/utils/passthrough";

const TRANSPARENT_1PX_WEBP = new Uint8Array([
  0x52, 0x49, 0x46, 0x46, 0x1a, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50, 0x56, 0x50, 0x38, 0x4c,
  0x0d, 0x00, 0x00, 0x00, 0x2f, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
]);

let uploadCounter = 0;

export const handlers = [
  http.post("https://upload.imagekit.io/api/v1/files/upload", async ({ request }) => {
    uploadCounter++;
    const formData = await request.formData();
    const fileNameValue = formData.get("fileName");

    const fileName =
      fileNameValue === null || fileNameValue instanceof File
        ? `upload-${uploadCounter}`
        : fileNameValue;

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

  http.delete("https://api.imagekit.io/v1/files/:fileId", () => {
    return new HttpResponse(null, { status: 204 });
  }),

  http.get("https://ik.imagekit.io/*", () => {
    return new HttpResponse(TRANSPARENT_1PX_WEBP, {
      headers: { "Content-Type": "image/webp" },
    });
  }),

  http.post("https://api.fastly.com/service/:serviceId/purge", () => {
    return HttpResponse.json({ status: "ok" });
  }),

  http.get(
    function isImageKitFormDataSupportProbe({ request }) {
      return request.url.startsWith("data:");
    },
    () => passthrough(),
  ),
];
