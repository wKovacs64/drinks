import { createController } from "remix/router";
import { routes } from "#/app/routes.ts";
import { getDb } from "#/app/db/client.ts";
import { createDrinksService } from "#/app/modules/drinks/drinks.ts";
import { galleryPageHeaders, notFoundHeaders } from "#/app/web/gallery-cache.ts";
import { DrinkPage } from "./show-page.tsx";
import { NotFoundPage } from "#/app/actions/not-found-page.tsx";

export default createController(routes.drinks, {
  actions: {
    async show(context) {
      const drinksService = createDrinksService({ db: getDb() });

      const result = await drinksService.getDrinkBySlug({
        slug: context.params.slug,
        viewerRole: context.auth.ok && context.auth.identity.role === "admin" ? "admin" : "user",
      });

      if (!result)
        return context.render(<NotFoundPage />, { status: 404, headers: notFoundHeaders });

      return context.render(<DrinkPage drink={result.drink} />, {
        headers: galleryPageHeaders({
          page: "drink",
          slug: result.drink.slug,
          visibility: result.visibility,
        }),
      });
    },
  },
});
