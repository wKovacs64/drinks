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

test("a save stays busy until the frame reloads, then settles with the navigation", () => {
  expect(saving).toEqual({ status: "saving" });
  expect(isSubmissionBusy(saving)).toBe(true);

  const settling = transitionDrinkFormSubmission(saving, { type: "reloaded" });

  expect(settling).toEqual({ status: "settling" });
  expect(isSubmissionBusy(settling)).toBe(false);
  expect(
    transitionDrinkFormSubmission(settling, { type: "navigated", outcome: "succeeded" }),
  ).toEqual(idleSubmission);
});

test("a rejected save navigation fails the save unless it was superseded", () => {
  const settling = transitionDrinkFormSubmission(saving, { type: "reloaded" });

  expect(transitionDrinkFormSubmission(settling, { type: "navigated", outcome: "failed" })).toEqual(
    { status: "failed", reason: "saveFailed" },
  );
  expect(transitionDrinkFormSubmission(saving, { type: "navigated", outcome: "aborted" })).toEqual(
    idleSubmission,
  );
});

test("a missing image or invalid field returns to editing without saving", () => {
  expect(run([{ type: "submit" }, { type: "cropped", outcome: "imageRequired" }])).toEqual({
    status: "failed",
    reason: "imageRequired",
  });
  expect(run([{ type: "submit" }, { type: "cropped", outcome: "invalid" }])).toEqual(
    idleSubmission,
  );
});

test("submits while busy are ignored and a retry clears the previous failure", () => {
  expect(transitionDrinkFormSubmission(saving, { type: "submit" })).toBe(saving);
  expect(
    transitionDrinkFormSubmission({ status: "failed", reason: "saveFailed" }, { type: "submit" }),
  ).toEqual({ status: "cropping" });
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
