import type { Handle } from "remix/component";
import type { DrinkView } from "#/app/modules/drinks/drinks.ts";
import { DrinkList } from "#/app/ui/drinks/drink-list.tsx";
import { SearchStatus } from "#/app/actions/search/public/search-status.tsx";
import { NoSearchTerm } from "#/app/actions/search/public/no-search-term.tsx";
import { NoDrinksFound } from "#/app/actions/search/no-drinks-found.tsx";

export function SearchResults(handle: Handle<{ query: string; drinks: DrinkView[] }>) {
  return () => {
    const { query, drinks } = handle.props;
    return (
      <div>
        <SearchStatus />
        <div className="peer-data-[search-pending=true]:hidden">
          {!query ? (
            <NoSearchTerm />
          ) : drinks.length === 0 ? (
            <NoDrinksFound />
          ) : (
            <DrinkList drinks={drinks} />
          )}
        </div>
      </div>
    );
  };
}
