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

test("a save ignores submits until its navigation finishes", () => {
  expect(saving).toEqual({ status: "saving" });
  expect(isSubmissionBusy(saving)).toBe(true);
  expect(transitionDrinkFormSubmission(saving, { type: "submit" })).toBe(saving);
  expect(
    transitionDrinkFormSubmission(saving, { type: "navigated", outcome: "succeeded" }),
  ).toEqual(idleSubmission);
});

test("an aborted save navigation returns to editing without a failure", () => {
  expect(transitionDrinkFormSubmission(saving, { type: "navigated", outcome: "aborted" })).toEqual(
    idleSubmission,
  );
});

test("a failed save navigation reports the failure", () => {
  expect(transitionDrinkFormSubmission(saving, { type: "navigated", outcome: "failed" })).toEqual({
    status: "failed",
    reason: "saveFailed",
  });
});

test("navigation events outside a save are ignored", () => {
  const cropping = run([{ type: "submit" }]);

  for (const event of [
    { type: "navigated", outcome: "failed" },
    { type: "resubmitted" },
  ] satisfies DrinkFormSubmissionEvent[]) {
    expect(transitionDrinkFormSubmission(idleSubmission, event)).toBe(idleSubmission);
    expect(transitionDrinkFormSubmission(cropping, event)).toBe(cropping);
  }
});
