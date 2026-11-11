import { clientEntry, on, ref, type Handle } from "remix/component";
import { animateEntrance, animateExit } from "@remix-run/ui/animation";
import type { ToastMessage } from "#/app/core/toast.ts";
import {
  startToastTimer,
  transitionToastTimer,
  type ToastHold,
  type ToastTimerEvent,
} from "./toast-timer.ts";

const toastColors = {
  success: "bg-[hsl(143_85%_96%)] border-[hsl(145_92%_87%)] text-[hsl(140_100%_27%)]",
  warning: "bg-[hsl(49_100%_97%)] border-[hsl(49_91%_84%)] text-[hsl(31_92%_45%)]",
};

const toastAnimation = {
  opacity: 0,
  transform: "translateY(100%)",
  duration: 400,
  easing: "ease",
};

const iconPaths = {
  success:
    "M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z",
  warning:
    "M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003zM12 8.25a.75.75 0 01.75.75v3.75a.75.75 0 01-1.5 0V9a.75.75 0 01.75-.75zm0 8.25a.75.75 0 100-1.5.75.75 0 000 1.5z",
};

export const Toast = clientEntry(
  import.meta.url,
  function Toast(handle: Handle<ToastMessage & { notificationId: string }>) {
    let notificationId = handle.props.notificationId;
    let toastElement: HTMLElement | undefined;
    let timer = startToastTimer(Date.now());
    let expiry: ReturnType<typeof setTimeout> | undefined;
    let swipeStart: { x: number; y: number } | undefined;

    function send(event: ToastTimerEvent) {
      const previous = timer;
      timer = transitionToastTimer(timer, event);

      if (timer === previous) return;
      scheduleExpiry();
      void handle.update();
    }

    function scheduleExpiry() {
      clearTimeout(expiry);

      if (timer.status === "running" && toastElement)
        expiry = setTimeout(() => send({ type: "dismiss" }), timer.remainingMs);
    }

    function hold(type: ToastHold) {
      send({ type: "hold", hold: type, now: Date.now() });
    }

    function release(type: ToastHold) {
      send({ type: "release", hold: type, now: Date.now() });
    }

    const initialize = ref((element, signal) => {
      if (element instanceof HTMLElement) toastElement = element;
      scheduleExpiry();
      window.addEventListener(
        "keydown",
        (event) => {
          if (event.altKey && event.key.toLowerCase() === "t" && element instanceof HTMLElement) {
            event.preventDefault();
            element.focus();
          }
        },
        { signal },
      );
      signal.addEventListener(
        "abort",
        () => {
          toastElement = undefined;
          clearTimeout(expiry);
        },
        { once: true },
      );
    });

    return () => {
      if (notificationId !== handle.props.notificationId) {
        notificationId = handle.props.notificationId;
        timer = transitionToastTimer(timer, { type: "restart", now: Date.now() });
        swipeStart = undefined;
        handle.queueTask((signal) => {
          if (!signal.aborted) scheduleExpiry();
        });
      }

      return timer.status !== "dismissed" ? (
        <section
          key="toast"
          aria-label="Notifications"
          className={`fixed right-6 bottom-6 z-[999999] flex w-[356px] touch-none items-center gap-1.5 rounded-lg border p-4 font-[family-name:ui-sans-serif,system-ui,sans-serif] text-sm font-medium shadow-[0_4px_12px_#0000001a] sm:w-auto [@media(max-width:600px)]:right-4 [@media(max-width:600px)]:bottom-4 [@media(max-width:600px)]:left-4 [@media(max-width:600px)]:w-auto ${toastColors[handle.props.kind]}`}
          role="status"
          // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- Alt+T focuses notifications; focus pauses expiry and Escape dismisses them.
          tabIndex={0}
          data-kind={handle.props.kind}
          data-state={timer.status}
          mix={[
            animateEntrance(toastAnimation),
            animateExit(toastAnimation),
            initialize,
            on("pointerenter", () => hold("hover")),
            on("pointerleave", () => release("hover")),
            // Keyboard focus holds the toast; focus from a mouse press does not outlast the press.
            on("focus", (event) => {
              if (event.currentTarget.matches(":focus-visible")) hold("focus");
            }),
            on("blur", () => release("focus")),
            on("keydown", (event) => {
              if (event instanceof KeyboardEvent && event.key === "Escape")
                send({ type: "dismiss" });
            }),
            on("pointerdown", (event) => {
              if (event instanceof PointerEvent) {
                swipeStart = { x: event.clientX, y: event.clientY };
                event.currentTarget.setPointerCapture(event.pointerId);
                hold("press");
              }
            }),
            on("pointercancel", () => {
              swipeStart = undefined;
              release("press");
            }),
            on("pointerup", (event) => {
              if (!(event instanceof PointerEvent) || !swipeStart) return;

              const swiped =
                Math.abs(event.clientX - swipeStart.x) > 45 || event.clientY - swipeStart.y > 45;

              swipeStart = undefined;

              if (swiped) send({ type: "dismiss" });
              else release("press");
            }),
          ]}
        >
          <div className="mr-1 -ml-[3px] flex size-4 shrink-0 items-center">
            <svg
              className="-ml-px shrink-0"
              width="20"
              height="20"
              viewBox={handle.props.kind === "warning" ? "0 0 24 24" : "0 0 20 20"}
              fill="currentColor"
              aria-hidden
            >
              <path fillRule="evenodd" clipRule="evenodd" d={iconPaths[handle.props.kind]} />
            </svg>
          </div>
          <span className="leading-normal">{handle.props.message}</span>
        </section>
      ) : null;
    };
  },
);
