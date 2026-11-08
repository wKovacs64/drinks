import type { Handle } from "remix/component";
import type { RenderFunction } from "remix/middleware/render";
import { routes } from "#/app/routes.ts";
import { Document } from "./document.tsx";
import { Gallery } from "#/app/ui/gallery.tsx";
import { NotFound } from "#/app/ui/core/not-found.tsx";
import { notFoundHeaders } from "#/app/web/gallery-cache.ts";

export function NotFoundPage(handle: Handle<{ gallery?: boolean }>) {
  return () => (
    <Document title="Not Found" description="There's nothing of interest here.">
      {handle.props.gallery === true ? (
        <Gallery breadcrumbs={[{ title: "All Drinks", href: routes.home.href() }]}>
          <NotFound />
        </Gallery>
      ) : (
        <NotFound />
      )}
    </Document>
  );
}

/** Renders the gallery not-found page for URLs no route matches, whatever the method. */
export function renderUnmatchedUrl(render: RenderFunction, method: string) {
  // Only safe-method 404s are shared cacheable; other methods never carried public cache headers.
  const headers =
    method === "GET" || method === "HEAD" ? notFoundHeaders : { "Cache-Control": "no-store" };

  return render(<NotFoundPage gallery />, { status: 404, headers });
}
