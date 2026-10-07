import { createController } from "remix/router";
import { routes } from "#/app/routes.ts";
import { authenticate, initiateLogin, logout } from "#/app/modules/identity/identity.ts";
import { LoginFailedPage } from "./login-failed-page.tsx";
import { UnauthorizedPage } from "./unauthorized-page.tsx";
export default createController(routes.auth, {
  actions: {
    login: initiateLogin,
    callback: authenticate,
    logout,
    failed(context) {
      return context.render(<LoginFailedPage />);
    },
    unauthorized(context) {
      return context.render(<UnauthorizedPage />);
    },
  },
});
