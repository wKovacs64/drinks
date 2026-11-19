import { assertNever } from "#/app/core/public/assert-never.ts";

export type DrinkFormSubmission =
  | { status: "idle" }
  | { status: "failed"; reason: "imageRequired" | "saveFailed" }
  | { status: "cropping" }
  | { status: "resubmitting" }
  | { status: "saving" }
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
