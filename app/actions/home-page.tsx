import type { Handle } from "remix/component";
import { Document } from "#/app/actions/document.tsx";
import type { DrinkView } from "#/app/modules/drinks/drinks.ts";
import { Gallery } from "#/app/ui/gallery.tsx";
import { DrinkList } from "#/app/ui/drinks/drink-list.tsx";
import { getGalleryImagePreloads } from "#/app/ui/drinks/image-preload.tsx";

export function HomePage(handle: Handle<{ drinks: DrinkView[] }>) {
  return () => {
    const { drinks } = handle.props;
    return (
      <Document preloadImages={getGalleryImagePreloads(drinks)}>
        <Gallery breadcrumbs={[{ title: "All Drinks" }]}>
          <DrinkList drinks={drinks} />
        </Gallery>
      </Document>
    );
  };
}
