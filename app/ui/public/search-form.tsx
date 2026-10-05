import { clientEntry, ref, type Handle } from "remix/component";
import { Icon } from "#/app/ui/icons/icon.tsx";
export const SearchForm = clientEntry(
  import.meta.url,
  function SearchForm(handle: Handle<{ initialSearchTerm: string }>) {
    let searchInput: HTMLInputElement | undefined;
    let previousSearchTerm = handle.props.initialSearchTerm;
    const initializeSearchInput = ref((element, signal) => {
      if (!(element instanceof HTMLInputElement)) return;
      searchInput = element;
      element.focus();
      window.addEventListener(
        "keydown",
        (event) => {
          if (event.key === "Escape") {
            element.value = "";
            element.focus();
          }
        },
        { signal },
      );
    });
    return () => {
      if (previousSearchTerm !== handle.props.initialSearchTerm) {
        previousSearchTerm = handle.props.initialSearchTerm;
        if (searchInput) searchInput.value = previousSearchTerm;
      }
      return (
        <form
          method="get"
          action="/search"
          data-rmx-target="search-results"
          className="mb-8 flex h-12 bg-white"
        >
          <input
            name="q"
            aria-label="Search Term"
            placeholder="Search all drinks..."
            type="text"
            autoCapitalize="none"
            autoComplete="off"
            autoCorrect="off"
            defaultValue={handle.props.initialSearchTerm}
            className="drinks-focusable mx-0.75 w-full p-4 placeholder:text-slate-500"
            mix={initializeSearchInput}
          />
          <button
            className="drinks-focusable bg-maroon text-cream hover:bg-cream hover:text-maroon focus-visible:bg-cream focus-visible:text-maroon px-2"
            title="Search"
            type="submit"
          >
            <span className="sr-only">Search</span>
            <Icon name="ic-baseline-chevron-right" aria-hidden size={32} />
          </button>
        </form>
      );
    };
  },
);
