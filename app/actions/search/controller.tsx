import { createController } from "remix/router";
import { routes } from "#/app/routes.ts";
import { getDb } from "#/app/db/client.ts";
import { createDrinksService } from "#/app/modules/drinks/drinks.ts";
import { publicHeaders } from "#/app/web/gallery-cache.ts";
import { SearchPage } from "./page.tsx";
import { SearchForm } from "./public/search-form.tsx";
import { getClientEntryPreloads } from "#/app/assets.ts";
if (process.env.NODE_ENV === "production") await getClientEntryPreloads(SearchForm);
export default createController(routes.search, {
  actions: {
    async index(context) {
      const drinksService = createDrinksService({ db: getDb() });
      const query = context.url.searchParams.get("q") ?? "";
      const drinks = await drinksService.searchPublishedDrinks({ query });
      const headers = {
        ...publicHeaders,
        "Surrogate-Key": query ? "search all" : "all",
      };
      return context.render(<SearchPage query={query} drinks={drinks} />, { headers });
    },
  },
});
