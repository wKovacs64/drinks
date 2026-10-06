import { createController } from "remix/router";
import { routes } from "#/app/routes.ts";
import { getDb } from "#/app/db/client.server.ts";
import { createDrinksService } from "#/app/modules/drinks/drinks.server.ts";
import { redirect } from "remix/response/redirect";
import { getClientEntryPreloads } from "#/app/assets.ts";
import { DrinkForm } from "../public/drink-form.tsx";
import { DrinkEditorPage } from "../editor-page.tsx";
import { createDrinkWriteService } from "../write-service.server.ts";
import { createAdminDrinkActionAdapter } from "#/app/web/admin-drink-write/route-adapter.server.ts";
if (process.env.NODE_ENV === "production") await getClientEntryPreloads(DrinkForm);
export default createController(routes.admin.drinks.new, {
  actions: {
    async index(context) {
      if (!context.auth.ok) return redirect(routes.auth.login.href());
      const drinksService = createDrinksService({ db: getDb() });
      const editor = await drinksService.getNewDrinkEditor();
      return context.render(
        <DrinkEditorPage
          editor={editor}
          user={context.auth.identity}
          action={routes.admin.drinks.new.action.href()}
          modulePreloads={await getClientEntryPreloads(DrinkForm)}
        />,
      );
    },
    action(context) {
      return createAdminDrinkActionAdapter({
        request: context.request,
        session: context.session,
        adminDrinksWriteService: createDrinkWriteService(),
      });
    },
  },
});
