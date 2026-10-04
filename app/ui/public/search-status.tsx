import { clientEntry, type Handle } from "remix/component";
import { NoSearchTerm } from "#/app/ui/search/no-search-term.tsx";
import { Searching } from "#/app/ui/search/searching.tsx";

export const SearchStatus = clientEntry(import.meta.url, function SearchStatus(handle: Handle) {
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
    return (
      <div
        className="search-status"
        data-search-pending={pendingQuery !== undefined || leaving ? "true" : undefined}
      >
        {!leaving &&
          pendingQuery !== undefined &&
          (pendingQuery ? <Searching /> : <NoSearchTerm />)}
      </div>
    );
  };
});
