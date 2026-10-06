import { createController } from "remix/router";
import { routes } from "#/app/routes.ts";
import { getDb } from "#/app/db/client.server.ts";
import { createDrinksService } from "#/app/modules/drinks/drinks.server.ts";
import { redirect } from "remix/response/redirect";
import { getClientEntryPreloads } from "#/app/assets.ts";
import { DrinkForm } from "../public/drink-form.tsx";
import { DrinkEditorPage } from "../editor-page.tsx";
import { createDrinkWriteService } from "../write-service.server.ts";
import { ResponseErrorDocument } from "#/app/ui/core/response-error-document.tsx";
import { updateAdminDrinkActionAdapter } from "#/app/web/admin-drink-write/route-adapter.server.ts";
export default createController(routes.admin.drinks.edit, {
  actions: {
    async index(context) {
      if (!context.auth.ok) return redirect(routes.auth.login.href());
      const drinksService = createDrinksService({ db: getDb() });
      const editor = await drinksService.findDrinkEditorBySlug(context.params.slug);
      if (!editor) return context.render(<ResponseErrorDocument status={404} />, { status: 404 });
      return context.render(
        <DrinkEditorPage
          editor={editor}
          user={context.auth.identity}
          action={routes.admin.drinks.edit.action.href({ slug: context.params.slug })}
          modulePreloads={await getClientEntryPreloads(DrinkForm)}
        />,
      );
    },
    action(context) {
      return updateAdminDrinkActionAdapter({
        request: context.request,
        session: context.session,
        slug: context.params.slug,
        adminDrinksWriteService: createDrinkWriteService(),
      });
    },
  },
});
