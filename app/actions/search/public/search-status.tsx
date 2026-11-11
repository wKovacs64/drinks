import { routes } from "#/app/routes.ts";
import { clientEntry, type Handle } from "remix/component";
import { NoSearchTerm } from "#/app/actions/search/public/no-search-term.tsx";
import { Searching } from "#/app/actions/search/public/searching.tsx";

/** A pending search with an empty query is clearing the results. */
type SearchState = { status: "settled" } | { status: "pending"; query: string };

export const SearchStatus = clientEntry(import.meta.url, function SearchStatus(handle: Handle) {
  let search: SearchState = { status: "settled" };
  handle.frame.addEventListener(
    "reloadStart",
    () => {
      const destination = new URL(handle.frame.src, window.location.href);

      // Leaving search keeps the results visible until the next page arrives.
      if (destination.pathname !== routes.search.index.href()) return;
      search = { status: "pending", query: destination.searchParams.get("q") ?? "" };
      void handle.update();
    },
    { signal: handle.signal },
  );
  handle.frame.addEventListener(
    "reloadComplete",
    () => {
      search = { status: "settled" };
      void handle.update();
    },
    { signal: handle.signal },
  );

  return () => {
    return (
      <div className="peer" data-search-pending={search.status === "pending" ? "true" : undefined}>
        {search.status === "pending" && (search.query ? <Searching /> : <NoSearchTerm />)}
      </div>
    );
  };
});
