import type { Handle } from "remix/component";
import { routes } from "#/app/routes.ts";
import { Document } from "#/app/actions/document.tsx";
import type { DrinkView } from "#/app/modules/drinks/drinks.ts";
import { Gallery } from "#/app/ui/gallery.tsx";
import { DrinkSummary } from "#/app/ui/drinks/drink-summary.tsx";
import { DrinkDetails } from "#/app/ui/drinks/drink-details.tsx";
import { Glass } from "#/app/ui/drinks/glass.tsx";
import { imageUrl } from "#/app/core/public/images.ts";

export function DrinkPage(handle: Handle<{ drink: DrinkView }>) {
  return () => {
    const { drink } = handle.props;
    return (
      <Document
        title={drink.title}
        description={drink.ingredients.join(", ")}
        socialTitle={drink.title}
        socialDescription={drink.ingredients.join(", ")}
        socialImage={imageUrl(drink.image.url, 1200, "jpg", 630, 50)}
        socialImageAlt={`${drink.title} in a glass`}
        preloadImages={[{ src: drink.image.url, layout: "detail" }]}
      >
        <Gallery
          breadcrumbs={[{ title: "All Drinks", href: routes.home.href() }, { title: drink.title }]}
        >
          <Glass>
            <DrinkSummary drink={drink} variant="detail" priority />
            <DrinkDetails drink={drink} />
          </Glass>
        </Gallery>
      </Document>
    );
  };
}
