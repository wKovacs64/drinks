import { Accept } from "remix/headers";
import { EDITOR_RESPONSE_MEDIA_TYPE } from "./public/editor-response.ts";

export function acceptsEditorResponse(request: Request): boolean {
  // Wildcards must keep native HTML navigation; only an explicit editor media type opts in.
  return (Accept.from(request.headers.get("Accept")).get(EDITOR_RESPONSE_MEDIA_TYPE) ?? 0) > 0;
}
