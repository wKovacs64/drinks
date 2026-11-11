import { createController } from "remix/router";
import { routes } from "#/app/routes.ts";
import { getDb } from "#/app/db/client.ts";
import { createDrinksService } from "#/app/modules/drinks/drinks.ts";
import { galleryPageHeaders } from "#/app/web/gallery-cache.ts";
import { SearchPage } from "./page.tsx";
import { SearchForm } from "./public/search-form.tsx";
import { SearchStatus } from "./public/search-status.tsx";
import { getModulePreloads } from "#/app/assets.ts";

// Production compiles these graphs once at boot; development recomputes them so edits stay fresh.
const productionModulePreloads =
  process.env.NODE_ENV === "production"
    ? await getModulePreloads(SearchForm, SearchStatus)
    : undefined;

export default createController(routes.search, {
  actions: {
    async index(context) {
      const drinksService = createDrinksService({ db: getDb() });
      const query = context.url.searchParams.get("q") ?? "";
      const drinks = await drinksService.searchPublishedDrinks({ query });

      const modulePreloads =
        productionModulePreloads ?? (await getModulePreloads(SearchForm, SearchStatus));

      return context.render(
        <SearchPage query={query} drinks={drinks} modulePreloads={modulePreloads} />,
        { headers: galleryPageHeaders({ page: "search", query }) },
      );
    },
  },
});
