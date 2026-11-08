import { createController } from "remix/router";
import { routes } from "#/app/routes.ts";
import { requireAdmin } from "#/app/middleware/admin.ts";
import { newDrinkEditor } from "#/app/modules/drinks/drinks.ts";
import { renderDrinkEditor } from "#/app/actions/admin/drinks/editor-page.tsx";
import { createDrinkWriteService } from "#/app/actions/admin/drinks/write-service.ts";
import { createAdminDrinkActionAdapter } from "#/app/web/admin-drink-write/route-adapter.ts";

export default createController(routes.admin.drinks.new, {
  middleware: requireAdmin,
  actions: {
    index(context) {
      return renderDrinkEditor(context, {
        editor: newDrinkEditor,
        user: context.auth.identity,
        action: routes.admin.drinks.new.action.href(),
      });
    },
    action(context) {
      return createAdminDrinkActionAdapter({
        request: context.request,
        session: context.session,
        adminDrinksWriteService: createDrinkWriteService(),
        invalidEditor: {
          load: async () => newDrinkEditor,
          render: (editor, errors) =>
            renderDrinkEditor(context, {
              editor,
              user: context.auth.identity,
              action: routes.admin.drinks.new.action.href(),
              errors,
            }),
        },
      });
    },
  },
});
