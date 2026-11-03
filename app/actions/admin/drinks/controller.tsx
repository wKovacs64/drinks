import { createController } from "remix/router";
import { routes } from "#/app/routes.ts";
import { requireAdmin } from "#/app/middleware/admin.ts";
import { getDb } from "#/app/db/client.ts";
import { createDrinksService } from "#/app/modules/drinks/drinks.ts";
import { parseSafe } from "remix/data-schema";
import { toastSchema } from "#/app/core/toast.ts";
import { deleteAdminDrinkActionAdapter } from "#/app/web/admin-drink-write/route-adapter.ts";
import { getClientEntryPreloads } from "#/app/assets.ts";
import { AdminDrinksList } from "./public/admin-drinks-list.tsx";
import { AdminDrinksPage } from "./index-page.tsx";
import { createDrinkWriteService } from "./write-service.ts";
if (process.env.NODE_ENV === "production") await getClientEntryPreloads(AdminDrinksList);
export default createController(routes.admin.drinks, {
  middleware: requireAdmin,
  actions: {
    async index(context) {
      const drinksService = createDrinksService({ db: getDb() });
      const drinkSummaries = await drinksService.getAllDrinks();
      const toastResult = parseSafe(toastSchema, context.session.get("toast"));
      return context.render(
        <AdminDrinksPage
          drinkSummaries={drinkSummaries}
          user={context.auth.identity}
          toast={toastResult.success ? toastResult.value : undefined}
          modulePreloads={await getClientEntryPreloads(AdminDrinksList)}
        />,
      );
    },
    deleteDrink(context) {
      return deleteAdminDrinkActionAdapter({
        request: context.request,
        session: context.session,
        slug: context.params.slug,
        adminDrinksWriteService: createDrinkWriteService(),
      });
    },
  },
});
