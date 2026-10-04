import { clientEntry, type Handle } from "remix/component";
import type { DrinkView } from "#/app/modules/drinks/drinks.ts";
import { DrinkList } from "#/app/ui/drinks/drink-list.tsx";
import { NoSearchTerm } from "#/app/ui/search/no-search-term.tsx";
import { NoDrinksFound } from "#/app/ui/search/no-drinks-found.tsx";
import { Searching } from "#/app/ui/search/searching.tsx";

export const SearchResults = clientEntry(
  import.meta.url,
  function SearchResults(handle: Handle<{ query: string; drinks: DrinkView[] }>) {
    let pendingQuery: string | undefined;
    let leaving = false;
    handle.frame.addEventListener(
      "reloadStart",
      () => {
        const destination = new URL(handle.frame.src, window.location.href);
        leaving = destination.pathname !== "/search";
        pendingQuery = destination.searchParams.get("q") ?? "";
        void handle.update();
      },
      { signal: handle.signal },
    );
    handle.frame.addEventListener(
      "reloadComplete",
      () => {
        pendingQuery = undefined;
        leaving = false;
        void handle.update();
      },
      { signal: handle.signal },
    );
    return () => {
      if (leaving) return null;
      if (pendingQuery !== undefined) return pendingQuery ? <Searching /> : <NoSearchTerm />;
      const { query, drinks } = handle.props;
      return !query ? (
        <NoSearchTerm />
      ) : drinks.length === 0 ? (
        <NoDrinksFound />
      ) : (
        <DrinkList drinks={drinks} />
      );
    };
  },
);
