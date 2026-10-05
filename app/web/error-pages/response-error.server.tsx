import { renderToStream } from "remix/component/server";
import { createHtmlResponse } from "remix/response/html";
import { ResponseErrorDocument } from "#/app/ui/core/response-error-document.tsx";

// This root fallback has no hydrated components or application assets to resolve.
export function renderResponseError(status: number): Response {
  return createHtmlResponse(renderToStream(<ResponseErrorDocument status={status} />), { status });
}
