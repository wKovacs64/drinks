import { createRouter, type RouterContext } from "remix/router";
import { render } from "remix/middleware/render";
import { staticFiles } from "remix/middleware/static";
import { cop } from "remix/middleware/cop";
import { compression } from "remix/middleware/compression";
import { logger } from "remix/middleware/logger";
import { isCompressibleMimeType } from "remix/mime";
import {
  getIdentitySessionMiddleware,
  getIdentityAuthMiddleware,
} from "#/app/modules/identity/identity.ts";
import controller from "./actions/controller.tsx";
import { renderAssets } from "./assets.ts";
import { routes } from "./routes.ts";
import { adminDrinkEditorRedirects } from "#/app/web/admin-drink-write/editor-redirects.ts";
import { routeErrorPages } from "#/app/web/error-pages/route-errors.tsx";
import { protectAdmin } from "./middleware/admin.ts";
import { responseHeaders } from "./middleware/response-headers.ts";
import drinksController from "./actions/drinks/controller.tsx";
import tagsController from "./actions/tags/controller.tsx";
import searchController from "./actions/search/controller.tsx";
import authController from "./actions/auth/controller.tsx";
import adminController from "./actions/admin/controller.ts";
import adminDrinksController from "./actions/admin/drinks/controller.tsx";
import newDrinkController from "./actions/admin/drinks/new/controller.tsx";
import editDrinkController from "./actions/admin/drinks/edit/controller.tsx";
const renderMiddleware = render({
  assets: renderAssets,
  onError: (error) => console.error("Remix rendering failed", error),
});
const sessionMiddleware = getIdentitySessionMiddleware();
const authMiddleware = getIdentityAuthMiddleware();
export const router = createRouter({
  middleware: [
    logger({
      format: "%method %pathname %status %duration ms",
      colors: false,
      log: process.env.NODE_ENV === "test" ? () => {} : undefined,
    }),
    // The original origin deliberately leaves compression to Fastly and Fly Proxy.
    process.env.NODE_ENV === "production"
      ? (_context, next) => next()
      : compression({
          filterMediaType: (mediaType) =>
            mediaType !== "text/event-stream" && isCompressibleMimeType(mediaType),
        }),
    cop(),
    staticFiles("./public", { index: false }),
    renderMiddleware,
    sessionMiddleware,
    authMiddleware,
    responseHeaders,
    routeErrorPages,
    adminDrinkEditorRedirects,
    protectAdmin,
  ],
});
export type AppContext = RouterContext<typeof router>;
declare module "remix" {
  interface RouterTypes {
    context: AppContext;
  }
}
router.map(routes, controller);
router.map(routes.drinks, drinksController);
router.map(routes.tags, tagsController);
router.map(routes.search, searchController);
router.map(routes.auth, authController);
router.map(routes.admin, adminController);
router.map(routes.admin.drinks, adminDrinksController);
router.map(routes.admin.drinks.new, newDrinkController);
router.map(routes.admin.drinks.edit, editDrinkController);
