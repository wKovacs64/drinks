import type { Middleware } from "remix/router";
import { Renderer, type RenderFunction } from "remix/middleware/render";
import { Document } from "#/app/ui/document.tsx";
import { Exception } from "#/app/ui/core/exception.tsx";
import { ApplicationErrorDocument } from "#/app/ui/core/response-error-document.tsx";

function isRenderFunction(value: unknown): value is RenderFunction {
  return typeof value === "function";
}

export const routeErrorPages: Middleware = async (context, next) => {
  const pathname = context.url.pathname;
  const isResourceRoute =
    pathname.startsWith("/assets/") ||
    pathname.startsWith("/_/") ||
    ["/robots.txt", "/manifest.webmanifest"].includes(pathname);
  if (isResourceRoute) return next();
  const isPublicPage =
    pathname !== "/admin" &&
    !pathname.startsWith("/admin/") &&
    !pathname.startsWith("/auth/") &&
    !["/login", "/logout", "/login-failed", "/unauthorized"].includes(pathname);

  try {
    return await next();
  } catch (error) {
    if (context.request.signal.aborted) throw error;
    const renderResponse = context.get(Renderer);
    if (!isRenderFunction(renderResponse)) throw error;
    console.error("Route failed", error);
    const message =
      process.env.NODE_ENV === "production"
        ? "Unexpected Server Error"
        : error instanceof Error
          ? error.message
          : "Unknown Error";
    const exception = <Exception message={message} />;
    const headers = { "Cache-Control": "no-store", Vary: "X-Remix-Target" };
    if (!isPublicPage) {
      const details =
        process.env.NODE_ENV === "production"
          ? ""
          : error instanceof Error
            ? (error.stack ?? error.message)
            : "Unknown Error";
      return renderResponse(<ApplicationErrorDocument details={details} />, {
        status: 500,
        headers,
      });
    }
    return renderResponse(
      context.request.headers.get("X-Remix-Target") === "search-results" ? (
        exception
      ) : (
        <Document>{exception}</Document>
      ),
      { status: 500, headers },
    );
  }
};
