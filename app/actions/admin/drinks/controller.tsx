import { createController } from "remix/router";
import { routes } from "#/app/routes.ts";
import { requireAdmin } from "#/app/middleware/admin.ts";
import { getDb } from "#/app/db/client.ts";
import { createDrinksService } from "#/app/modules/drinks/drinks.ts";
import { readFlashedToast } from "#/app/core/toast.ts";
import { deleteAdminDrinkActionAdapter } from "#/app/web/admin-drink-write/route-adapter.ts";
import { AdminDrinksPage } from "./index-page.tsx";

export default createController(routes.admin.drinks, {
  middleware: requireAdmin,
  actions: {
    async index(context) {
      const drinksService = createDrinksService({ db: getDb() });
      const drinkSummaries = await drinksService.getAllDrinks();

      return context.render(
        <AdminDrinksPage
          drinkSummaries={drinkSummaries}
          user={context.auth.identity}
          toast={readFlashedToast(context.session)}
        />,
      );
    },
    deleteDrink(context) {
      return deleteAdminDrinkActionAdapter(context);
    },
  },
});
