import { routes } from "#/app/routes.ts";
import { clientEntry, on, type Handle, type RemixNode } from "remix/component";
import { classes } from "#/app/core/public/strings.ts";
import type { AdminDrinkListItem } from "#/app/modules/drinks/drinks.ts";

type Drink = Omit<AdminDrinkListItem, "createdAt" | "updatedAt"> & {
  createdAt: string;
  updatedAt: string;
  presentation: {
    thumbnail: RemixNode;
    detailHref: string;
    editHref: string;
    deleteAction: string;
  };
};

type SortableColumn = "title" | "slug" | "calories" | "rank" | "status" | "createdAt" | "updatedAt";

/** Unsorted keeps the server's order. Directions match `aria-sort` values. */
type DrinkSort =
  | { status: "unsorted" }
  | { status: "sorted"; key: SortableColumn; direction: "ascending" | "descending" };

/** Each column cycles through ascending, descending, and the server's order. */
function nextSort(sort: DrinkSort, key: SortableColumn): DrinkSort {
  if (sort.status === "unsorted" || sort.key !== key)
    return { status: "sorted", key, direction: "ascending" };

  return sort.direction === "ascending"
    ? { status: "sorted", key, direction: "descending" }
    : { status: "unsorted" };
}

const SORTABLE_COLUMNS: { key: SortableColumn; label: string; align?: "right" }[] = [
  { key: "title", label: "Title" },
  { key: "slug", label: "Slug" },
  { key: "calories", label: "Calories" },
  { key: "rank", label: "Rank" },
  { key: "status", label: "Status" },
  { key: "createdAt", label: "Created" },
  { key: "updatedAt", label: "Updated" },
];

function compareDrinks(a: Drink, b: Drink, key: SortableColumn) {
  switch (key) {
    case "createdAt":
    case "updatedAt":
      return Date.parse(a[key]) - Date.parse(b[key]);
    case "calories":
    case "rank":
      return a[key] - b[key];
    default:
      return a[key].localeCompare(b[key]);
  }
}

function SortArrow(handle: Handle<{ direction: "ascending" | "descending" | undefined }>) {
  return () => {
    const { direction } = handle.props;

    return (
      <span aria-hidden className={classes("ml-1", !direction && "invisible")}>
        {direction === "descending" ? "↓" : "↑"}
      </span>
    );
  };
}

function DrinkRow(
  handle: Handle<{ drink: Drink; timestampFormatter: Intl.DateTimeFormat | undefined }>,
) {
  return () => {
    const { drink, timestampFormatter } = handle.props;

    return (
      <tr className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
        <td className="py-3 pr-4 whitespace-nowrap">
          <div className="flex items-center gap-3">
            {drink.presentation.thumbnail}
            <a
              href={drink.presentation.detailHref}
              className="font-medium text-zinc-300 hover:text-amber-500"
            >
              {drink.title}
            </a>
          </div>
        </td>
        <td className="py-3 pr-4 whitespace-nowrap text-zinc-400">{drink.slug}</td>
        <td className="py-3 pr-4 whitespace-nowrap text-zinc-400">{drink.calories}</td>
        <td className="py-3 pr-4 whitespace-nowrap text-zinc-400">{drink.rank}</td>
        <td className="py-3 pr-4 whitespace-nowrap">
          <span
            className={classes(
              "inline-block rounded px-2 py-0.5 text-xs font-medium",
              drink.status === "published"
                ? "bg-green-500/20 text-green-400"
                : "bg-zinc-500/20 text-zinc-400",
            )}
          >
            {drink.status}
          </span>
        </td>
        <td className="py-3 pr-4 whitespace-nowrap text-zinc-400">
          <time dateTime={drink.createdAt}>
            {timestampFormatter?.format(new Date(drink.createdAt))}
          </time>
        </td>
        <td className="py-3 pr-4 whitespace-nowrap text-zinc-400">
          <time dateTime={drink.updatedAt}>
            {timestampFormatter?.format(new Date(drink.updatedAt))}
          </time>
        </td>
        <td className="py-3 text-right whitespace-nowrap">
          <a href={drink.presentation.editHref} className="text-zinc-400 hover:text-amber-500">
            Edit
          </a>
          <form
            method="post"
            action={drink.presentation.deleteAction}
            className="ml-4 inline"
            mix={on("submit", (event) => {
              if (!confirm("Are you sure you want to delete this drink?")) {
                event.preventDefault();
              }
            })}
          >
            <button type="submit" className="text-zinc-500 hover:text-red-400">
              Delete
            </button>
          </form>
        </td>
      </tr>
    );
  };
}

export const AdminDrinksList = clientEntry(
  import.meta.url,
  function AdminDrinksList(handle: Handle<{ drinks: Drink[] }>) {
    let filter = "";
    let sort: DrinkSort = { status: "unsorted" };
    // Only the browser knows the viewer's time zone, so timestamps render after hydration.
    let timestampFormatter: Intl.DateTimeFormat | undefined;
    handle.queueTask(() => {
      timestampFormatter = new Intl.DateTimeFormat("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
      void handle.update();
    });

    function setFilter(value: string) {
      filter = value;
      void handle.update();
    }

    function handleSort(key: SortableColumn) {
      sort = nextSort(sort, key);
      void handle.update();
    }

    return () => {
      const { drinks } = handle.props;
      const filterLower = filter.toLowerCase();

      const filtered = drinks.filter((drink) =>
        [drink.id, drink.title, drink.slug, drink.imageUrl, drink.status].some((value) =>
          value.toLowerCase().includes(filterLower),
        ),
      );

      const currentSort = sort;

      const processed =
        currentSort.status === "sorted"
          ? filtered.toSorted((a, b) => {
              const comparison = compareDrinks(a, b, currentSort.key);

              return currentSort.direction === "ascending" ? comparison : -comparison;
            })
          : filtered;

      return (
        <div>
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-baseline gap-2">
              <h1 className="text-2xl font-medium text-zinc-200">Drinks</h1>
              <span className="text-zinc-500">{drinks.length}</span>
            </div>
            <a
              href={routes.admin.drinks.new.index.href()}
              className="rounded bg-amber-600 px-4 py-2 font-medium text-zinc-950 hover:bg-amber-500"
            >
              Add Drink
            </a>
          </div>

          <input
            type="text"
            value={filter}
            mix={[
              on<HTMLInputElement, "input">("input", (event) =>
                setFilter(event.currentTarget.value),
              ),
              on<HTMLInputElement, "keydown">("keydown", (event) => {
                if (event.key === "Escape") {
                  setFilter("");
                }
              }),
            ]}
            aria-label="Filter drinks"
            placeholder="Filter drinks..."
            className="mb-4 w-full rounded-sm border border-zinc-700 bg-zinc-800 px-3 py-2 text-zinc-200 placeholder-zinc-600 focus:border-amber-600 focus:ring-1 focus:ring-amber-600 focus:outline-none"
          />

          <div className="-m-2 overflow-x-auto p-2">
            <table className="w-full min-w-max">
              <thead>
                <tr className="border-b border-zinc-800 text-left text-sm tracking-wider text-zinc-500 uppercase">
                  {SORTABLE_COLUMNS.map((column) => {
                    const direction =
                      sort.status === "sorted" && sort.key === column.key
                        ? sort.direction
                        : undefined;

                    return (
                      <th key={column.key} aria-sort={direction} className="pr-4 pb-3 font-medium">
                        <button
                          type="button"
                          mix={on("click", () => handleSort(column.key))}
                          className="cursor-pointer hover:text-zinc-300"
                        >
                          {column.label}
                          <SortArrow direction={direction} />
                        </button>
                      </th>
                    );
                  })}
                  <th className="pb-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {processed.map((drink) => (
                  <DrinkRow key={drink.id} drink={drink} timestampFormatter={timestampFormatter} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );
    };
  },
);
