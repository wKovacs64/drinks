import type { Handle } from "remix/component";
import { Link } from "#/app/ui/navigation/link.tsx";
import { createHref as href } from "remix/route-pattern/href";
import type { DrinkView } from "#/app/modules/drinks/drinks.ts";
import { Glass } from "./glass.tsx";
import { DrinkSummary } from "./drink-summary.tsx";
import { drinkImageBreakpoints, galleryImageSizes } from "./image-layout.ts";

export function DrinkList(handle: Handle<{ drinks: DrinkView[] }>) {
  return () => {
    const { drinks } = handle.props;
    return (
      <div className="grid gap-4 sm:gap-8 lg:grid-cols-2 xl:grid-cols-3">
        {drinks.map((drink, index) => (
          <Link
            key={drink.slug}
            to={href("/:slug", { slug: drink.slug })}
            aria-label={drink.title}
            className="group focus-visible:outline-hidden"
            prefetch="viewport"
          >
            <Glass className="h-full transition group-hover:border-orange-800 group-hover:shadow-lg group-hover:shadow-orange-800 group-focus:border-orange-800 group-focus:shadow-lg group-focus:shadow-orange-800 lg:group-hover:-translate-y-2 lg:group-focus:-translate-y-2">
              <DrinkSummary
                drink={drink}
                breakpoints={drinkImageBreakpoints}
                sizes={galleryImageSizes}
                priority={index === 0}
              />
            </Glass>
          </Link>
        ))}
      </div>
    );
  };
}
