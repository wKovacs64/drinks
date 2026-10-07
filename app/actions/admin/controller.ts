import { createController } from "remix/router";
import { routes } from "#/app/routes.ts";
import { redirect } from "remix/response/redirect";
export default createController(routes.admin, {
  actions: {
    index() {
      return redirect(routes.admin.drinks.index.href());
    },
  },
});
