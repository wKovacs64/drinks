import type { RenderFunction } from "remix/middleware/render";
import { NotFoundPage } from "#/app/actions/not-found-page.tsx";

export function renderNotFound(render: RenderFunction): Response {
  return render(<NotFoundPage />, { status: 404 });
}
