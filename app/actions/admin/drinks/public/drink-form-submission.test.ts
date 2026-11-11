import { test } from "remix/test";
import { expect } from "remix/assert";
import {
  idleSubmission,
  isSubmissionBusy,
  transitionDrinkFormSubmission,
  type DrinkFormSubmission,
  type DrinkFormSubmissionEvent,
} from "./drink-form-submission.ts";

function run(events: DrinkFormSubmissionEvent[], submission: DrinkFormSubmission = idleSubmission) {
  return events.reduce(transitionDrinkFormSubmission, submission);
}

const saving = run([
  { type: "submit" },
  { type: "cropped", outcome: "ready" },
  { type: "resubmitted" },
]);

test("a save ignores submits until its frame reloads", () => {
  expect(saving).toEqual({ status: "saving" });
  expect(isSubmissionBusy(saving)).toBe(true);
  expect(transitionDrinkFormSubmission(saving, { type: "submit" })).toBe(saving);

  const settling = transitionDrinkFormSubmission(saving, { type: "reloaded" });

  expect(settling).toEqual({ status: "settling" });
  expect(isSubmissionBusy(settling)).toBe(false);
});

test("an aborted save navigation returns to editing without a failure", () => {
  const settling = transitionDrinkFormSubmission(saving, { type: "reloaded" });

  for (const submission of [saving, settling]) {
    expect(
      transitionDrinkFormSubmission(submission, { type: "navigated", outcome: "aborted" }),
    ).toEqual(idleSubmission);
  }
});

test("frame and navigation events outside a save are ignored", () => {
  const cropping = run([{ type: "submit" }]);

  for (const event of [
    { type: "reloaded" },
    { type: "navigated", outcome: "failed" },
    { type: "resubmitted" },
  ] satisfies DrinkFormSubmissionEvent[]) {
    expect(transitionDrinkFormSubmission(idleSubmission, event)).toBe(idleSubmission);
    expect(transitionDrinkFormSubmission(cropping, event)).toBe(cropping);
  }
});
