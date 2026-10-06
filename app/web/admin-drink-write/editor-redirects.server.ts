import { routes } from "#/app/routes.ts";
import type { Middleware } from "remix/router";
import {
  EDITOR_RESPONSE_MEDIA_TYPE,
  type DrinkEditorResponse,
} from "#/app/web/admin-drink-write/public/editor-response.ts";

// Browsers hide Location on manual fetch redirects. Wrap both the admin gate and write adapter
// so enhanced editor submissions receive the actual destination without fetching OAuth as HTML.
export const adminDrinkEditorRedirects: Middleware = async (context, next) => {
  const response = await next();
  const pathname = new URL(context.request.url).pathname;
  const isEditorSubmission =
    context.request.method === "POST" &&
    (pathname === routes.admin.drinks.new.action.href() ||
      /^\/admin\/drinks\/[^/]+\/edit$/.test(pathname)) &&
    context.request.headers.get("Accept") === EDITOR_RESPONSE_MEDIA_TYPE;
  const location = response.headers.get("Location");
  if (!isEditorSubmission || !location || response.status < 300 || response.status >= 400)
    return response;

  const data: DrinkEditorResponse = {
    kind: "navigate",
    location,
    document: new URL(location, context.request.url).pathname === routes.auth.login.href(),
  };
  const headers = new Headers(response.headers);
  headers.delete("Location");
  headers.delete("Content-Length");
  headers.set("Content-Type", EDITOR_RESPONSE_MEDIA_TYPE);
  // 3xx would still trigger fetch redirect processing; the destination is now response data.
  return Response.json(data, { headers });
};
