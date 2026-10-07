import type { Handle } from "remix/component";
import { routes } from "#/app/routes.ts";
import { Document } from "#/app/actions/document.tsx";
import type { DrinksByTagSlug } from "#/app/modules/drinks/drinks.ts";
import { Gallery } from "#/app/ui/gallery.tsx";
import { DrinkList } from "#/app/ui/drinks/drink-list.tsx";
import { getGalleryImagePreloads } from "#/app/ui/drinks/image-preload.tsx";

export function TagPage(handle: Handle<{ taggedDrinks: DrinksByTagSlug }>) {
  return () => {
    const { taggedDrinks } = handle.props;
    return (
      <Document
        title={`Drinks with ${taggedDrinks.tag.displayName}`}
        description={`All drinks containing ${taggedDrinks.tag.displayName}`}
        preloadImages={getGalleryImagePreloads(taggedDrinks.drinks)}
      >
        <Gallery
          breadcrumbs={[
            { title: "All Drinks", href: routes.home.href() },
            { title: "Tags", href: routes.tags.index.href() },
            {
              title: (
                <div className="inline-flex gap-2">
                  <span>{taggedDrinks.tag.displayName}</span>
                  <span>( {taggedDrinks.drinks.length} )</span>
                </div>
              ),
            },
          ]}
        >
          <DrinkList drinks={taggedDrinks.drinks} />
        </Gallery>
      </Document>
    );
  };
}
