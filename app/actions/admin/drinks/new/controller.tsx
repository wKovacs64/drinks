import { createController } from "remix/router";
import { routes } from "#/app/routes.ts";
import { requireAdmin } from "#/app/middleware/admin.ts";
import { newDrinkEditor } from "#/app/modules/drinks/drinks.ts";
import { getClientEntryPreloads } from "#/app/assets.ts";
import { DrinkForm } from "../public/drink-form.tsx";
import { DrinkEditorPage } from "../editor-page.tsx";
import { createDrinkWriteService } from "../write-service.ts";
import { createAdminDrinkActionAdapter } from "#/app/web/admin-drink-write/route-adapter.ts";
if (process.env.NODE_ENV === "production") await getClientEntryPreloads(DrinkForm);
export default createController(routes.admin.drinks.new, {
  middleware: requireAdmin,
  actions: {
    async index(context) {
      return context.render(
        <DrinkEditorPage
          editor={newDrinkEditor}
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
        invalidEditor: {
          load: async () => newDrinkEditor,
          async render(editor, errors) {
            return context.render(
              <DrinkEditorPage
                editor={editor}
                user={context.auth.identity}
                action={routes.admin.drinks.new.action.href()}
                modulePreloads={await getClientEntryPreloads(DrinkForm)}
                errors={errors}
              />,
              { status: 400 },
            );
          },
        },
      });
    },
  },
});
