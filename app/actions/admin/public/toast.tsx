import { clientEntry, on, ref, type Handle } from "remix/component";
import { animateEntrance, animateExit } from "@remix-run/ui/animation";

const toastColors = {
  success: "bg-[hsl(143_85%_96%)] border-[hsl(145_92%_87%)] text-[hsl(140_100%_27%)]",
  warning: "bg-[hsl(49_100%_97%)] border-[hsl(49_91%_84%)] text-[hsl(31_92%_45%)]",
  error: "bg-[hsl(359_100%_97%)] border-[hsl(359_100%_94%)] text-[hsl(360_100%_45%)]",
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
  error:
    "M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z",
};

export const Toast = clientEntry(
  import.meta.url,
  function Toast(
    handle: Handle<{
      kind: "success" | "warning" | "error";
      message: string;
      notificationId: string;
    }>,
  ) {
    let notificationId = handle.props.notificationId;
    let toastElement: HTMLElement | undefined;
    let visible = true;
    let remaining = 4000;
    let started = 0;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    let pointerStart: { x: number; y: number } | undefined;
    function dismiss() {
      if (!visible) return;
      clearTimeout(timeout);
      visible = false;
      void handle.update();
    }
    function pause() {
      if (!visible) return;
      clearTimeout(timeout);
      remaining = Math.max(0, remaining - (Date.now() - started));
    }
    function resume() {
      if (!visible) return;
      clearTimeout(timeout);
      started = Date.now();
      timeout = setTimeout(dismiss, remaining);
    }
    const initialize = ref((element, signal) => {
      if (element instanceof HTMLElement) toastElement = element;
      resume();
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
          clearTimeout(timeout);
        },
        { once: true },
      );
    });
    return () => {
      if (notificationId !== handle.props.notificationId) {
        notificationId = handle.props.notificationId;
        visible = true;
        remaining = 4000;
        pointerStart = undefined;
        handle.queueTask((signal) => {
          if (!signal.aborted && toastElement) resume();
        });
      }
      return visible ? (
        <section
          key="toast"
          aria-label="Notifications"
          className={`fixed right-6 bottom-6 z-[999999] flex w-[356px] touch-none items-center gap-1.5 rounded-lg border p-4 font-[family-name:ui-sans-serif,system-ui,sans-serif] text-sm font-medium shadow-[0_4px_12px_#0000001a] sm:w-auto [@media(max-width:600px)]:right-4 [@media(max-width:600px)]:bottom-4 [@media(max-width:600px)]:left-4 [@media(max-width:600px)]:w-auto ${toastColors[handle.props.kind]}`}
          role="status"
          // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- Alt+T focuses notifications; focus pauses expiry and Escape dismisses them.
          tabIndex={0}
          data-kind={handle.props.kind}
          mix={[
            animateEntrance(toastAnimation),
            animateExit(toastAnimation),
            initialize,
            on("pointerenter", pause),
            on("pointerleave", resume),
            on("focus", pause),
            on("blur", resume),
            on("keydown", (event) => {
              if (event instanceof KeyboardEvent && event.key === "Escape") dismiss();
            }),
            on("pointerdown", (event) => {
              if (event instanceof PointerEvent) {
                pointerStart = { x: event.clientX, y: event.clientY };
                event.currentTarget.setPointerCapture(event.pointerId);
                pause();
              }
            }),
            on("pointercancel", () => {
              pointerStart = undefined;
              resume();
            }),
            on("pointerup", (event) => {
              if (event instanceof PointerEvent && pointerStart) {
                if (
                  Math.abs(event.clientX - pointerStart.x) > 45 ||
                  event.clientY - pointerStart.y > 45
                )
                  dismiss();
                else resume();
                pointerStart = undefined;
              }
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
