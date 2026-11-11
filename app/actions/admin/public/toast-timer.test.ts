import { test } from "remix/test";
import { expect } from "remix/assert";
import {
  startToastTimer,
  TOAST_DURATION_MS,
  transitionToastTimer,
  type ToastTimer,
  type ToastTimerEvent,
} from "./toast-timer.ts";

function run(events: ToastTimerEvent[], timer: ToastTimer = startToastTimer(0)) {
  return events.reduce(transitionToastTimer, timer);
}

test("releasing a hold that is not held leaves the timer unchanged", () => {
  const running = startToastTimer(0);

  expect(transitionToastTimer(running, { type: "release", hold: "hover", now: 10 })).toBe(running);
});

test("a dismissed toast ignores holds until a new notification restarts it", () => {
  const dismissed = run([{ type: "dismiss" }, { type: "hold", hold: "hover", now: 10 }]);

  expect(dismissed).toEqual({ status: "dismissed" });
  expect(transitionToastTimer(dismissed, { type: "restart", now: 50 })).toEqual({
    status: "running",
    remainingMs: TOAST_DURATION_MS,
    resumedAt: 50,
  });
});

test("a new notification keeps current holds and gets the full duration", () => {
  expect(
    run([
      { type: "hold", hold: "hover", now: 3000 },
      { type: "restart", now: 4000 },
    ]),
  ).toEqual({ status: "paused", remainingMs: TOAST_DURATION_MS, holds: ["hover"] });
});
