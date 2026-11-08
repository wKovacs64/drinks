import { createController } from "remix/router";
import { routes } from "#/app/routes.ts";
import { requireAdmin } from "#/app/middleware/admin.ts";
import { redirect } from "remix/response/redirect";

export default createController(routes.admin, {
  middleware: requireAdmin,
  actions: {
    index() {
      return redirect(routes.admin.drinks.index.href());
    },
  },
});
