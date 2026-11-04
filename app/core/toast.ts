import { enum_, object, string, type InferOutput } from "remix/data-schema";

export const toastSchema = object({
  kind: enum_(["success", "warning"] as const),
  message: string(),
});

export type ToastMessage = InferOutput<typeof toastSchema>;
