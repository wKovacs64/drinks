import type { RenderFunction } from "remix/middleware/render";
import { Document } from "./document.tsx";
import { Gallery } from "#/app/ui/gallery.tsx";
import { NotFound } from "#/app/ui/core/not-found.tsx";
import { notFoundHeaders } from "#/app/web/gallery-cache.ts";

export function NotFoundPage() {
  return () => (
    <Document title="Not Found" description="There's nothing of interest here.">
      <Gallery>
        <NotFound />
      </Gallery>
    </Document>
  );
}

export function renderUnmatchedUrl(render: RenderFunction, method: string) {
  const headers =
    method === "GET" || method === "HEAD" ? notFoundHeaders : { "Cache-Control": "no-store" };

  return render(<NotFoundPage />, { status: 404, headers });
}
