import { assertNever } from "#/app/core/public/assert-never.ts";

export const TOAST_DURATION_MS = 4000;

/** Interactions that each keep a toast open until released. */
export type ToastHold = "hover" | "focus" | "press";

export type ToastTimer =
  | { status: "running"; remainingMs: number; resumedAt: number }
  | { status: "paused"; remainingMs: number; holds: readonly ToastHold[] }
  | { status: "dismissed" };

export type ToastTimerEvent =
  | { type: "hold"; hold: ToastHold; now: number }
  | { type: "release"; hold: ToastHold; now: number }
  | { type: "dismiss" }
  | { type: "restart"; now: number };

export function startToastTimer(now: number): ToastTimer {
  return { status: "running", remainingMs: TOAST_DURATION_MS, resumedAt: now };
}

export function transitionToastTimer(timer: ToastTimer, event: ToastTimerEvent): ToastTimer {
  switch (event.type) {
    case "restart":
      return timer.status === "paused"
        ? { ...timer, remainingMs: TOAST_DURATION_MS }
        : startToastTimer(event.now);

    case "dismiss":
      return { status: "dismissed" };

    case "hold":
      if (timer.status === "running") {
        return {
          status: "paused",
          remainingMs: Math.max(0, timer.remainingMs - (event.now - timer.resumedAt)),
          holds: [event.hold],
        };
      }

      if (timer.status === "paused" && !timer.holds.includes(event.hold)) {
        return { ...timer, holds: [...timer.holds, event.hold] };
      }

      return timer;

    case "release": {
      if (timer.status !== "paused") return timer;
      const holds = timer.holds.filter((hold) => hold !== event.hold);

      return holds.length > 0
        ? { ...timer, holds }
        : { status: "running", remainingMs: timer.remainingMs, resumedAt: event.now };
    }

    default:
      return assertNever(event);
  }
}
