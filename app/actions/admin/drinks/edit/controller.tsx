import { createController } from "remix/router";
import { routes } from "#/app/routes.ts";
import { requireAdmin } from "#/app/middleware/admin.ts";
import { getDb } from "#/app/db/client.ts";
import { createDrinksService } from "#/app/modules/drinks/drinks.ts";
import { renderDrinkEditor } from "#/app/actions/admin/drinks/editor-page.tsx";
import { renderResponseError } from "#/app/web/error-pages/response-error.tsx";
import { updateAdminDrinkActionAdapter } from "#/app/web/admin-drink-write/route-adapter.ts";

export default createController(routes.admin.drinks.edit, {
  middleware: requireAdmin,
  actions: {
    async index(context) {
      const drinksService = createDrinksService({ db: getDb() });
      const editor = await drinksService.findDrinkEditorBySlug(context.params.slug);

      if (!editor) return renderResponseError(context.render, 404);

      return renderDrinkEditor(context, {
        editor,
        user: context.auth.identity,
        action: routes.admin.drinks.edit.action.href({ slug: context.params.slug }),
      });
    },
    action(context) {
      return updateAdminDrinkActionAdapter(context);
    },
  },
});
