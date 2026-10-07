import type { AppContext } from "#/app/router.ts";
import type { DrinksService } from "#/app/modules/drinks/drinks.ts";
import { SearchPage, SearchResultsRegion } from "#/app/actions/search/page.tsx";
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

  const page =
    context.request.headers.get("X-Remix-Target") === "search-results" ? (
      <SearchResultsRegion query={query} drinks={drinks} />
    ) : (
      <SearchPage query={query} drinks={drinks} />
    );
  return context.render(page, { headers });
}
