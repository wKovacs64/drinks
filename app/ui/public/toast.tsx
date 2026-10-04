import { clientEntry, on, ref, type Handle } from "remix/component";

const iconPaths = {
  success:
    "M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z",
  warning:
    "M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003zM12 8.25a.75.75 0 01.75.75v3.75a.75.75 0 01-1.5 0V9a.75.75 0 01.75-.75zm0 8.25a.75.75 0 100-1.5.75.75 0 000 1.5z",
  error:
    "M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 001.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z",
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
    let removed = false;
    let remaining = 4000;
    let started = 0;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    let pointerStart: { x: number; y: number } | undefined;
    function dismiss() {
      if (removed) return;
      clearTimeout(timeout);
      removed = true;
      void handle.update();
      timeout = setTimeout(() => {
        visible = false;
        void handle.update();
      }, 400);
    }
    function pause() {
      if (removed || !visible) return;
      clearTimeout(timeout);
      remaining = Math.max(0, remaining - (Date.now() - started));
    }
    function resume() {
      if (removed || !visible) return;
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
      signal.addEventListener("abort", () => clearTimeout(timeout), { once: true });
    });
    return () => {
      if (notificationId !== handle.props.notificationId) {
        notificationId = handle.props.notificationId;
        visible = true;
        removed = false;
        remaining = 4000;
        if (toastElement) resume();
      }
      return visible ? (
        <section
          aria-label="Notifications"
          className={`drink-toast toast-${handle.props.kind}`}
          role="status"
          // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- Alt+T focuses notifications; focus pauses expiry and Escape dismisses them.
          tabIndex={0}
          data-removed={removed}
          mix={[
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
          <div className="drink-toast-icon">
            <svg
              width="20"
              height="20"
              viewBox={handle.props.kind === "warning" ? "0 0 24 24" : "0 0 20 20"}
              fill="currentColor"
              aria-hidden
            >
              <path fillRule="evenodd" clipRule="evenodd" d={iconPaths[handle.props.kind]} />
            </svg>
          </div>
          <span>{handle.props.message}</span>
        </section>
      ) : null;
    };
  },
);
