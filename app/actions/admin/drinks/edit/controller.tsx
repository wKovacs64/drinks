import { createController } from "remix/router";
import { routes } from "#/app/routes.ts";
import { requireAdmin } from "#/app/middleware/admin.ts";
import { getDb } from "#/app/db/client.ts";
import { createDrinksService } from "#/app/modules/drinks/drinks.ts";
import { getClientEntryPreloads } from "#/app/assets.ts";
import { DrinkForm } from "../public/drink-form.tsx";
import { DrinkEditorPage } from "../editor-page.tsx";
import { createDrinkWriteService } from "../write-service.ts";
import { ResponseErrorDocument } from "#/app/ui/core/response-error-document.tsx";
import { updateAdminDrinkActionAdapter } from "#/app/web/admin-drink-write/route-adapter.ts";
export default createController(routes.admin.drinks.edit, {
  middleware: requireAdmin,
  actions: {
    async index(context) {
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
        invalidEditor: {
          load: () =>
            createDrinksService({ db: getDb() }).findDrinkEditorBySlug(context.params.slug),
          async render(editor, errors) {
            return context.render(
              <DrinkEditorPage
                editor={editor}
                user={context.auth.identity}
                action={routes.admin.drinks.edit.action.href({ slug: context.params.slug })}
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
