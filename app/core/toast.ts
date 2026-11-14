import { enum_, object, parseSafe, string, type InferOutput } from "remix/data-schema";
import type { Session } from "remix/session";

const toastFlashKey = "toast";

const toastSchema = object({
  kind: enum_(["success", "warning"] as const),
  message: string(),
});

export type ToastMessage = InferOutput<typeof toastSchema>;

/** Shows `toast` on the next request that reads it from `session`. */
export function flashToast(session: Session, toast: ToastMessage) {
  session.flash(toastFlashKey, toast);
}

export function readFlashedToast(session: Session): ToastMessage | undefined {
  const toastResult = parseSafe(toastSchema, session.get(toastFlashKey));

  return toastResult.success ? toastResult.value : undefined;
}
