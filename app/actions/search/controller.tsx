import { createController } from "remix/router";
import { routes } from "#/app/routes.ts";
import { getDb } from "#/app/db/client.ts";
import { createDrinksService } from "#/app/modules/drinks/drinks.ts";
import { searchPageRouteAdapter } from "#/app/web/search-page/route-adapter.tsx";
import { SearchForm } from "./public/search-form.tsx";
import { getClientEntryPreloads } from "#/app/assets.ts";
if (process.env.NODE_ENV === "production") await getClientEntryPreloads(SearchForm);
export default createController(routes.search, {
  actions: {
    index(context) {
      const drinksService = createDrinksService({ db: getDb() });
      return searchPageRouteAdapter({ context, drinksService });
    },
  },
});
