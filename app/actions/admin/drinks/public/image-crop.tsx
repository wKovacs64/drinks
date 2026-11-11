import { css, on, ref, type Handle } from "remix/component";
import { Image } from "#/app/ui/images/public/image.tsx";

const cropBorderStyles = css({
  backgroundImage:
    "linear-gradient(90deg, #fff 50%, #444 50%), linear-gradient(90deg, #fff 50%, #444 50%), linear-gradient(#fff 50%, #444 50%), linear-gradient(#fff 50%, #444 50%)",
  backgroundPosition: "0 0, 0 100%, 0 0, 100% 0",
  backgroundRepeat: "repeat-x, repeat-x, repeat-y, repeat-y",
  backgroundSize: "10px 1px, 10px 1px, 1px 10px, 1px 10px",
  animation: "1s linear infinite drinks-crop-border",
  "@keyframes drinks-crop-border": {
    from: { backgroundPosition: "0 0, 0 100%, 0 0, 100% 0" },
    to: { backgroundPosition: "20px 0, -20px 100%, 0 -20px, 100% 20px" },
  },
});

const cropHandlePositions = {
  nw: "top-0 left-0 -translate-x-1/2 -translate-y-1/2 cursor-nw-resize",
  ne: "top-0 right-0 translate-x-1/2 -translate-y-1/2 cursor-ne-resize",
  se: "bottom-0 right-0 translate-x-1/2 translate-y-1/2 cursor-se-resize",
  sw: "bottom-0 left-0 -translate-x-1/2 translate-y-1/2 cursor-sw-resize",
};

type Crop = { x: number; y: number; size: number };

type Size = { width: number; height: number };

/** The chosen file, from its object URL through a crop sized to the displayed image. */
type CropSelection =
  | { status: "empty" }
  | { status: "loading"; objectUrl: string }
  | { status: "ready"; objectUrl: string; crop: Crop; displayedSize: Size };

function resizeCrop(crop: Crop, bounds: Size, direction: string, delta: number): Crop {
  const west = direction.includes("w"),
    north = direction.includes("n");

  const maximum = Math.min(
    west ? crop.x + crop.size : bounds.width - crop.x,
    north ? crop.y + crop.size : bounds.height - crop.y,
  );

  const size = Math.max(1, Math.min(maximum, crop.size + delta));

  return {
    size,
    x: west ? crop.x + crop.size - size : crop.x,
    y: north ? crop.y + crop.size - size : crop.y,
  };
}

function moveCrop(crop: Crop, bounds: Size, deltaX: number, deltaY: number): Crop {
  return {
    size: crop.size,
    x: Math.max(0, Math.min(bounds.width - crop.size, crop.x + deltaX)),
    y: Math.max(0, Math.min(bounds.height - crop.size, crop.y + deltaY)),
  };
}

function getObjectUrl(selection: CropSelection) {
  return selection.status === "empty" ? undefined : selection.objectUrl;
}

export function ImageCrop(
  handle: Handle<{
    existingImageUrl?: string;
    onCropReady: (getImage: () => Promise<Blob | null>) => void;
  }>,
) {
  let isInteractive = false;
  let selection: CropSelection = { status: "empty" };
  let imageElement: HTMLImageElement | undefined;
  let fileInput: HTMLInputElement | undefined;

  const initializeFileInput = ref<HTMLInputElement>((element, signal) => {
    fileInput = element;

    if (!isInteractive) {
      isInteractive = true;
      void handle.update();
    }

    signal.addEventListener(
      "abort",
      () => {
        if (fileInput === element) fileInput = undefined;
      },
      { once: true },
    );
  });

  const cropMaskId = `crop-mask-${crypto.randomUUID()}`;

  function select(next: CropSelection) {
    if (selection.status !== "empty" && selection.objectUrl !== getObjectUrl(next)) {
      URL.revokeObjectURL(selection.objectUrl);
    }

    selection = next;
    void handle.update();
  }

  function setCrop(crop: Crop) {
    if (selection.status !== "ready") return;
    selection = { ...selection, crop };
    void handle.update();
  }

  handle.signal.addEventListener(
    "abort",
    () => {
      if (selection.status !== "empty") URL.revokeObjectURL(selection.objectUrl);
    },
    { once: true },
  );
  handle.props.onCropReady(async () => {
    if (!imageElement || selection.status !== "ready") return null;
    const { crop } = selection;
    const image = imageElement;
    const canvas = document.createElement("canvas");
    const scale = image.naturalWidth / image.width;
    canvas.width = canvas.height = crop.size * scale;
    const context = canvas.getContext("2d");

    if (!context) return null;
    context.drawImage(
      image,
      crop.x * scale,
      (crop.y * image.naturalHeight) / image.height,
      crop.size * scale,
      crop.size * scale,
      0,
      0,
      canvas.width,
      canvas.height,
    );

    return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.9));
  });

  function initializeCrop() {
    if (!imageElement || selection.status === "empty") return;
    const { width, height } = imageElement;
    const size = Math.min(width * 0.9, height);

    select({
      status: "ready",
      objectUrl: selection.objectUrl,
      crop: { x: (width - size) / 2, y: (height - size) / 2, size },
      displayedSize: { width, height },
    });
  }

  function beginDrag(
    event: PointerEvent & { currentTarget: Element },
    signal: AbortSignal,
    direction?: string,
  ) {
    if (!imageElement || selection.status !== "ready") return;
    event.preventDefault();
    event.stopPropagation();
    const element = event.currentTarget;
    element.setPointerCapture(event.pointerId);
    const startingCrop = selection.crop;

    const startingX = event.clientX,
      startingY = event.clientY;

    const width = imageElement.width,
      height = imageElement.height;

    function move(moveEvent: PointerEvent) {
      if (moveEvent.pointerId !== event.pointerId) return;

      const deltaX = moveEvent.clientX - startingX,
        deltaY = moveEvent.clientY - startingY;

      if (!direction) {
        setCrop(moveCrop(startingCrop, { width, height }, deltaX, deltaY));

        return;
      }

      const west = direction.includes("w"),
        north = direction.includes("n");

      const delta =
        direction.includes("e") || west ? deltaX * (west ? -1 : 1) : deltaY * (north ? -1 : 1);

      setCrop(resizeCrop(startingCrop, { width, height }, direction, delta));
    }

    const controller = new AbortController();
    const gestureSignal = AbortSignal.any([signal, controller.signal]);
    element.addEventListener(
      "pointermove",
      (moveEvent) => {
        if (moveEvent instanceof PointerEvent) move(moveEvent);
      },
      { signal: gestureSignal },
    );
    element.addEventListener("pointerup", () => controller.abort(), {
      once: true,
      signal: gestureSignal,
    });
    element.addEventListener("pointercancel", () => controller.abort(), {
      once: true,
      signal: gestureSignal,
    });
  }

  function resizeWithKeyboard(event: KeyboardEvent, direction: string) {
    if (selection.status !== "ready" || !imageElement || !event.key.startsWith("Arrow")) return;
    event.preventDefault();
    event.stopPropagation();

    const west = direction.includes("w"),
      north = direction.includes("n");

    const step = (navigator.platform.includes("Mac") ? event.metaKey : event.ctrlKey)
      ? 100
      : event.shiftKey
        ? 10
        : 1;

    const delta =
      event.key === "ArrowLeft"
        ? west
          ? step
          : -step
        : event.key === "ArrowRight"
          ? west
            ? -step
            : step
          : event.key === "ArrowUp"
            ? north
              ? step
              : -step
            : north
              ? -step
              : step;

    setCrop(resizeCrop(selection.crop, imageElement, direction, delta));
  }

  function beginDraw(event: PointerEvent & { currentTarget: Element }, signal: AbortSignal) {
    if (!imageElement || selection.status !== "ready" || event.button !== 0) return;
    event.preventDefault();
    const element = event.currentTarget;
    element.setPointerCapture(event.pointerId);
    const bounds = imageElement.getBoundingClientRect();
    const startingX = Math.max(0, Math.min(bounds.width, event.clientX - bounds.left));
    const startingY = Math.max(0, Math.min(bounds.height, event.clientY - bounds.top));
    const controller = new AbortController();
    const gestureSignal = AbortSignal.any([signal, controller.signal]);
    element.addEventListener(
      "pointermove",
      (moveEvent) => {
        if (!(moveEvent instanceof PointerEvent) || moveEvent.pointerId !== event.pointerId) return;
        const deltaX = moveEvent.clientX - bounds.left - startingX;
        const deltaY = moveEvent.clientY - bounds.top - startingY;

        const maximum = Math.min(
          deltaX < 0 ? startingX : bounds.width - startingX,
          deltaY < 0 ? startingY : bounds.height - startingY,
        );

        const size = Math.max(1, Math.min(Math.abs(deltaX), maximum));
        setCrop({
          size,
          x: deltaX < 0 ? startingX - size : startingX,
          y: deltaY < 0 ? startingY - size : startingY,
        });
      },
      { signal: gestureSignal },
    );
    element.addEventListener("pointerup", () => controller.abort(), {
      once: true,
      signal: gestureSignal,
    });
    element.addEventListener("pointercancel", () => controller.abort(), {
      once: true,
      signal: gestureSignal,
    });
  }

  return () => {
    const filePicker = (
      <input
        type="file"
        name="imageFile"
        aria-label="Image"
        accept="image/jpeg,image/png,image/webp,image/gif"
        required={!isInteractive && !handle.props.existingImageUrl}
        className={isInteractive ? "hidden" : "block w-full text-zinc-300"}
        mix={[
          initializeFileInput,
          on<HTMLInputElement, "change">("change", (event) => {
            const file = event.currentTarget.files?.[0];

            if (!file) return;
            select({ status: "loading", objectUrl: URL.createObjectURL(file) });
          }),
        ]}
      />
    );

    const changeButton = (
      <button
        type="button"
        mix={on("click", () => {
          if (fileInput) fileInput.value = "";
          select({ status: "empty" });
        })}
        className="rounded border border-zinc-700 px-3 py-1.5 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200"
      >
        Change image
      </button>
    );

    if (selection.status !== "empty") {
      const crop = selection.status === "ready" ? selection.crop : undefined;

      return (
        <div className="space-y-3">
          {filePicker}
          <div>
            <div className="relative inline-block max-h-96 max-w-full cursor-crosshair">
              <div
                className="max-h-[inherit] overflow-hidden"
                mix={on("pointerdown", (event, signal) => {
                  if (event instanceof PointerEvent) beginDraw(event, signal);
                })}
              >
                <img
                  alt="Crop preview"
                  className="block max-h-[inherit] max-w-full touch-none"
                  src={selection.objectUrl}
                  draggable={false}
                  mix={[
                    ref((element, signal) => {
                      if (!(element instanceof HTMLImageElement)) return;
                      imageElement = element;

                      if (
                        element.complete &&
                        element.naturalWidth > 0 &&
                        selection.status === "loading"
                      )
                        initializeCrop();

                      const observer = new ResizeObserver(() => {
                        const width = element.width,
                          height = element.height;

                        if (width === 0 || height === 0 || selection.status !== "ready") return;
                        const previous = selection.displayedSize;

                        if (width === previous.width && height === previous.height) return;
                        const scale = width / previous.width;
                        const size = Math.min(selection.crop.size * scale, width, height);

                        select({
                          ...selection,
                          crop: {
                            size,
                            x: Math.min(width - size, selection.crop.x * scale),
                            y: Math.min(
                              height - size,
                              (selection.crop.y * height) / previous.height,
                            ),
                          },
                          displayedSize: { width, height },
                        });
                      });

                      observer.observe(element);
                      signal.addEventListener("abort", () => observer.disconnect(), { once: true });
                    }),
                    on<HTMLImageElement, "load">("load", initializeCrop),
                  ]}
                />
              </div>
              {crop && imageElement ? (
                <svg
                  className="pointer-events-none absolute inset-0 size-[calc(100%+0.5px)]"
                  width="100%"
                  height="100%"
                  aria-hidden
                >
                  <defs>
                    <mask id={cropMaskId}>
                      <rect width="100%" height="100%" fill="white" />
                      <rect
                        x={`${(crop.x / imageElement.width) * 100}%`}
                        y={`${(crop.y / imageElement.height) * 100}%`}
                        width={`${(crop.size / imageElement.width) * 100}%`}
                        height={`${(crop.size / imageElement.height) * 100}%`}
                        fill="black"
                      />
                    </mask>
                  </defs>
                  <rect
                    width="100%"
                    height="100%"
                    fill="black"
                    fillOpacity={0.5}
                    mask={`url(#${cropMaskId})`}
                  />
                </svg>
              ) : null}
              {crop && imageElement ? (
                <div
                  className="absolute top-0 left-0 cursor-move touch-none text-white focus:outline-2 focus:-outline-offset-1 focus:outline-[#08f] focus:outline-solid"
                  // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- The crop group handles arrow keys to move the selection.
                  tabIndex={0}
                  role="group"
                  aria-label="Use the arrow keys to move the crop selection area"
                  style={{
                    top: `${crop.y}px`,
                    left: `${crop.x}px`,
                    width: `${crop.size}px`,
                    height: `${crop.size}px`,
                  }}
                  mix={[
                    cropBorderStyles,
                    on("pointerdown", (event, signal) => {
                      if (event instanceof PointerEvent) beginDrag(event, signal);
                    }),
                    on("keydown", (event) => {
                      if (
                        !(event instanceof KeyboardEvent) ||
                        selection.status !== "ready" ||
                        !imageElement ||
                        !event.key.startsWith("Arrow")
                      )
                        return;

                      const amount = (
                        navigator.platform.includes("Mac") ? event.metaKey : event.ctrlKey
                      )
                        ? 100
                        : event.shiftKey
                          ? 10
                          : 1;

                      event.preventDefault();
                      setCrop(
                        moveCrop(
                          selection.crop,
                          imageElement,
                          event.key === "ArrowRight"
                            ? amount
                            : event.key === "ArrowLeft"
                              ? -amount
                              : 0,
                          event.key === "ArrowDown"
                            ? amount
                            : event.key === "ArrowUp"
                              ? -amount
                              : 0,
                        ),
                      );
                    }),
                  ]}
                >
                  <div>
                    {Object.entries(cropHandlePositions).map(([direction, positionClasses]) => (
                      <div
                        key={direction}
                        className={`absolute size-3 border border-[#ffffffb3] bg-[#0003] focus:bg-[#08f] [@media(pointer:coarse)]:size-6 ${positionClasses}`}
                        tabIndex={0}
                        role="button"
                        aria-label={`Use the arrow keys to move the ${direction.includes("n") ? "north" : "south"} ${direction.includes("w") ? "west" : "east"} drag handle to change the crop selection area`}
                        mix={[
                          on("pointerdown", (event, signal) => {
                            if (event instanceof PointerEvent) beginDrag(event, signal, direction);
                          }),
                          on("keydown", (event) => {
                            if (event instanceof KeyboardEvent)
                              resizeWithKeyboard(event, direction);
                          }),
                        ]}
                      />
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
          {changeButton}
        </div>
      );
    }

    if (handle.props.existingImageUrl)
      return (
        <div className="space-y-3">
          {filePicker}
          <div className="flex items-center gap-4 rounded border border-dashed border-zinc-700 bg-zinc-900 p-4">
            <Image
              src={handle.props.existingImageUrl}
              alt="Current"
              width={80}
              height={80}
              className="rounded object-cover"
            />
            {isInteractive ? (
              <button
                type="button"
                mix={on("click", () => fileInput?.click())}
                className="rounded border border-zinc-700 px-3 py-1.5 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200"
              >
                Change image
              </button>
            ) : null}
          </div>
        </div>
      );

    return (
      <div className="space-y-3">
        {filePicker}
        {isInteractive ? (
          <div className="flex items-center justify-center rounded border border-dashed border-zinc-700 bg-zinc-900 p-8">
            <button
              type="button"
              mix={on("click", () => fileInput?.click())}
              className="rounded bg-zinc-800 px-4 py-2 text-zinc-300 hover:bg-zinc-700"
            >
              Select image
            </button>
          </div>
        ) : null}
      </div>
    );
  };
}
