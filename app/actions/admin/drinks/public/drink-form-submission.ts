import { assertNever } from "#/app/core/public/assert-never.ts";

/**
 * The enhanced editor's save lifecycle. The runtime cannot await the crop, so a submit is held
 * while the crop renders, then resubmitted natively as a frame navigation. The frame reloads
 * before the navigation settles, and a failed reload rejects the navigation afterward.
 */
export type DrinkFormSubmission =
  | { status: "idle" }
  | { status: "failed"; reason: "imageRequired" | "saveFailed" }
  /** The submit was held while the crop renders. */
  | { status: "cropping" }
  /** The native resubmit is dispatching synchronously; its submit event must pass through. */
  | { status: "resubmitting" }
  /** The frame navigation is loading the response. */
  | { status: "saving" }
  /** The frame rendered the response; the navigation has not settled. */
  | { status: "settling" };

export type DrinkFormSubmissionEvent =
  | { type: "submit" }
  | { type: "cropped"; outcome: "ready" | "imageRequired" | "invalid" }
  | { type: "resubmitted" }
  | { type: "reloaded" }
  | { type: "navigated"; outcome: "succeeded" | "aborted" | "failed" };

export const idleSubmission: DrinkFormSubmission = { status: "idle" };

const afterCrop = {
  ready: { status: "resubmitting" },
  imageRequired: { status: "failed", reason: "imageRequired" },
  invalid: idleSubmission,
} satisfies Record<
  Extract<DrinkFormSubmissionEvent, { type: "cropped" }>["outcome"],
  DrinkFormSubmission
>;

export function isSubmissionBusy(submission: DrinkFormSubmission) {
  return (
    submission.status === "cropping" ||
    submission.status === "resubmitting" ||
    submission.status === "saving"
  );
}

export function transitionDrinkFormSubmission(
  submission: DrinkFormSubmission,
  event: DrinkFormSubmissionEvent,
): DrinkFormSubmission {
  switch (event.type) {
    case "submit":
      return isSubmissionBusy(submission) ? submission : { status: "cropping" };

    case "cropped":
      return submission.status === "cropping" ? afterCrop[event.outcome] : submission;

    case "resubmitted":
      return submission.status === "resubmitting" ? { status: "saving" } : submission;

    case "reloaded":
      return submission.status === "saving" ? { status: "settling" } : submission;

    case "navigated":
      if (submission.status !== "saving" && submission.status !== "settling") return submission;

      return event.outcome === "failed"
        ? { status: "failed", reason: "saveFailed" }
        : idleSubmission;

    default:
      return assertNever(event);
  }
}
