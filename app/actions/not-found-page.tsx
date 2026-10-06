import type { Handle } from "remix/component";
import { routes } from "#/app/routes.ts";
import { Document } from "./document.tsx";
import { Gallery } from "#/app/ui/gallery.tsx";
import { NotFound } from "#/app/ui/core/not-found.tsx";
export function NotFoundPage(handle: Handle<{ gallery?: boolean }>) {
  return () => (
    <Document title="Not Found" description="There's nothing of interest here.">
      {handle.props.gallery ? (
        <Gallery breadcrumbs={[{ title: "All Drinks", href: routes.home.href() }]}>
          <NotFound />
        </Gallery>
      ) : (
        <NotFound />
      )}
    </Document>
  );
}
