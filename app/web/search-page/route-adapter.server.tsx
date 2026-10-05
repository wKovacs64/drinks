import { Frame } from "remix/component";
import type { AppContext } from "#/app/router.ts";
import type { DrinksService } from "#/app/modules/drinks/drinks.ts";
import { Document } from "#/app/ui/document.tsx";
import { Gallery } from "#/app/ui/gallery.tsx";
import { Breadcrumbs } from "#/app/ui/navigation/breadcrumbs.tsx";
import { SearchForm } from "#/app/ui/public/search-form.tsx";
import { SearchResults } from "#/app/ui/search/search-results.tsx";
import { getGalleryImagePreloads } from "#/app/ui/drinks/image-preload.tsx";

export async function searchPageRouteAdapter(input: {
  context: AppContext;
  drinksService: DrinksService;
}) {
  const { context, drinksService } = input;
  const query = new URL(context.request.url).searchParams.get("q") ?? "";
  const drinks = await drinksService.searchPublishedDrinks({ query });
  const headers = {
    "Cache-Control":
      "public, max-age=30, s-maxage=31536000, stale-while-revalidate=600, stale-if-error=86400",
    "Surrogate-Key": query ? "search all" : "all",
    Vary: "X-Remix-Target",
  };

  if (context.request.headers.get("X-Remix-Target") === "search-results") {
    return context.render(
      <div className="flex flex-col gap-6 sm:gap-8">
        <Breadcrumbs
          breadcrumbs={[
            { title: "All Drinks", href: "/" },
            { title: "Search", href: query ? "/search" : undefined },
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
      </div>,
      { headers },
    );
  }

  return context.render(
    <Document
      title="Search Drinks"
      description="Search all drinks by ingredient or description"
      preloadImages={getGalleryImagePreloads(drinks)}
    >
      <Gallery>
        <Frame name="search-results" src={`/search?${new URLSearchParams({ q: query })}`} />
      </Gallery>
    </Document>,
    { headers },
  );
}
