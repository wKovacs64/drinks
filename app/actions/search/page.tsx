import { Frame, type Handle } from "remix/component";
import { routes } from "#/app/routes.ts";
import type { DrinkView } from "#/app/modules/drinks/drinks.ts";
import { Document } from "#/app/actions/document.tsx";
import { Gallery } from "#/app/ui/gallery.tsx";
import { Breadcrumbs } from "#/app/ui/navigation/breadcrumbs.tsx";
import { SearchForm } from "./public/search-form.tsx";
import { SearchResults } from "./search-results.tsx";
import { getGalleryImagePreloads } from "#/app/ui/drinks/image-preload.tsx";
type SearchPageProps = { query: string; drinks: DrinkView[] };
export function SearchResultsRegion(handle: Handle<SearchPageProps>) {
  return () => {
    const { query, drinks } = handle.props;
    return (
      <div className="flex flex-col gap-6 sm:gap-8">
        <Breadcrumbs
          breadcrumbs={[
            { title: "All Drinks", href: routes.home.href() },
            { title: "Search", href: query ? routes.search.index.href() : undefined },
            ...(query
              ? [
                  {
                    title: (
                      <span>
                        &quot;<span>{query}</span>&quot;
                      </span>
                    ),
                  },
                ]
              : []),
          ]}
        />
        <div>
          <SearchForm initialSearchTerm={query} />
          <SearchResults query={query} drinks={drinks} />
        </div>
      </div>
    );
  };
}
export function SearchPage(handle: Handle<SearchPageProps>) {
  return () => {
    const { query, drinks } = handle.props;
    return (
      <Document
        title="Search Drinks"
        description="Search all drinks by ingredient or description"
        preloadImages={getGalleryImagePreloads(drinks)}
      >
        <Gallery>
          <Frame
            name="search-results"
            src={routes.search.index.href({}, { searchParams: { q: query } })}
          />
        </Gallery>
      </Document>
    );
  };
}
