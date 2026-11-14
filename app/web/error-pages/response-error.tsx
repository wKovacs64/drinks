import type { RenderFunction } from "remix/middleware/render";
import { ResponseErrorDocument } from "#/app/ui/core/response-error-document.tsx";

export function renderResponseError(render: RenderFunction, status: number): Response {
  return render(<ResponseErrorDocument status={status} />, { status });
}
