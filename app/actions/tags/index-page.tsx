import type { Handle } from "remix/component";
import { routes } from "#/app/routes.ts";
import { Document } from "#/app/actions/document.tsx";
import type { DrinkTagView } from "#/app/modules/drinks/drinks.ts";
import { Gallery } from "#/app/ui/gallery.tsx";
import { Tag } from "#/app/ui/tags/tag.tsx";
import { TagLink } from "#/app/ui/tags/tag-link.tsx";

export function TagsPage(handle: Handle<{ tags: DrinkTagView[] }>) {
  return () => {
    const { tags } = handle.props;
    return (
      <Document title="Ingredient Tags" description="Discover drinks by ingredient">
        <Gallery
          breadcrumbs={[{ title: "All Drinks", href: routes.home.href() }, { title: "Tags" }]}
        >
          <div className="mx-4 grid gap-4 sm:mx-0 sm:gap-8 lg:grid-cols-2 xl:grid-cols-3">
            {tags.map((tag) => (
              <TagLink to={routes.tags.show.href({ tag: tag.slug })} key={tag.slug}>
                <Tag className="p-4 text-2xl lg:p-6 lg:text-4xl">{tag.displayName}</Tag>
              </TagLink>
            ))}
          </div>
        </Gallery>
      </Document>
    );
  };
}
