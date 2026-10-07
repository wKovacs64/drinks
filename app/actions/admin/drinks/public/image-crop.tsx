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

function resizeCrop(
  crop: Crop,
  bounds: { width: number; height: number },
  direction: string,
  delta: number,
): Crop {
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

export function ImageCrop(
  handle: Handle<{
    existingImageUrl?: string;
    onCropReady: (getImage: () => Promise<Blob | null>) => void;
  }>,
) {
  let isInteractive = false;
  let imageSource = "";
  let crop: Crop | undefined;
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
  let previousImageWidth = 0;
  let previousImageHeight = 0;
  let error: string | undefined;
  const cropMaskId = `crop-mask-${crypto.randomUUID()}`;
  handle.signal.addEventListener(
    "abort",
    () => {
      if (imageSource) URL.revokeObjectURL(imageSource);
    },
    { once: true },
  );
  handle.props.onCropReady(async () => {
    if (!imageElement || !crop) return null;
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
    if (!imageElement) return;
    previousImageWidth = imageElement.width;
    previousImageHeight = imageElement.height;
    const size = Math.min(imageElement.width * 0.9, imageElement.height);
    crop = { x: (imageElement.width - size) / 2, y: (imageElement.height - size) / 2, size };
    void handle.update();
  }
  function beginDrag(
    event: PointerEvent & { currentTarget: Element },
    signal: AbortSignal,
    direction?: string,
  ) {
    if (!imageElement || !crop) return;
    event.preventDefault();
    event.stopPropagation();
    const element = event.currentTarget;
    element.setPointerCapture(event.pointerId);
    const startingCrop = { ...crop };
    const startingX = event.clientX,
      startingY = event.clientY;
    const width = imageElement.width,
      height = imageElement.height;
    function move(moveEvent: PointerEvent) {
      if (moveEvent.pointerId !== event.pointerId) return;
      const deltaX = moveEvent.clientX - startingX,
        deltaY = moveEvent.clientY - startingY;
      if (!direction) {
        crop = {
          ...startingCrop,
          x: Math.max(0, Math.min(width - startingCrop.size, startingCrop.x + deltaX)),
          y: Math.max(0, Math.min(height - startingCrop.size, startingCrop.y + deltaY)),
        };
      } else {
        const west = direction.includes("w"),
          north = direction.includes("n");
        const delta =
          direction.includes("e") || west ? deltaX * (west ? -1 : 1) : deltaY * (north ? -1 : 1);
        crop = resizeCrop(startingCrop, { width, height }, direction, delta);
      }
      void handle.update();
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
    if (!crop || !imageElement || !event.key.startsWith("Arrow")) return;
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
    crop = resizeCrop(crop, imageElement, direction, delta);
    void handle.update();
  }
  function beginDraw(event: PointerEvent & { currentTarget: Element }, signal: AbortSignal) {
    if (!imageElement || event.button !== 0) return;
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
        crop = {
          size,
          x: deltaX < 0 ? startingX - size : startingX,
          y: deltaY < 0 ? startingY - size : startingY,
        };
        void handle.update();
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
          on<HTMLInputElement, "change">("change", async (event) => {
            const file = event.currentTarget.files?.[0];
            if (!file) return;
            error = undefined;
            crop = undefined;
            if (imageSource) URL.revokeObjectURL(imageSource);
            imageSource = URL.createObjectURL(file);
            await handle.update();
          }),
        ]}
      />
    );
    const changeButton = (
      <button
        type="button"
        mix={on("click", () => {
          if (imageSource) URL.revokeObjectURL(imageSource);
          imageSource = "";
          crop = undefined;
          if (fileInput) fileInput.value = "";
          void handle.update();
        })}
        className="rounded border border-zinc-700 px-3 py-1.5 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200"
      >
        Change image
      </button>
    );
    if (imageSource)
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
                  src={imageSource}
                  draggable={false}
                  mix={[
                    ref((element, signal) => {
                      if (!(element instanceof HTMLImageElement)) return;
                      imageElement = element;
                      if (element.complete && element.naturalWidth && !crop) initializeCrop();
                      const observer = new ResizeObserver(() => {
                        const width = element.width,
                          height = element.height;
                        if (!width || !height) return;
                        if (
                          crop &&
                          previousImageWidth &&
                          previousImageHeight &&
                          (width !== previousImageWidth || height !== previousImageHeight)
                        ) {
                          const size = Math.min(
                            (crop.size * width) / previousImageWidth,
                            width,
                            height,
                          );
                          crop = {
                            size,
                            x: Math.min(width - size, (crop.x * width) / previousImageWidth),
                            y: Math.min(height - size, (crop.y * height) / previousImageHeight),
                          };
                          void handle.update();
                        }
                        previousImageWidth = width;
                        previousImageHeight = height;
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
                      if (!(event instanceof KeyboardEvent) || !crop || !imageElement) return;
                      const amount = (
                        navigator.platform.includes("Mac") ? event.metaKey : event.ctrlKey
                      )
                        ? 100
                        : event.shiftKey
                          ? 10
                          : 1;
                      if (event.key.startsWith("Arrow")) {
                        event.preventDefault();
                        crop.x = Math.max(
                          0,
                          Math.min(
                            imageElement.width - crop.size,
                            crop.x +
                              (event.key === "ArrowRight"
                                ? amount
                                : event.key === "ArrowLeft"
                                  ? -amount
                                  : 0),
                          ),
                        );
                        crop.y = Math.max(
                          0,
                          Math.min(
                            imageElement.height - crop.size,
                            crop.y +
                              (event.key === "ArrowDown"
                                ? amount
                                : event.key === "ArrowUp"
                                  ? -amount
                                  : 0),
                          ),
                        );
                        void handle.update();
                      }
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
          {error ? <p className="text-red-400">{error}</p> : null}
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
        {error ? <p className="text-red-400">{error}</p> : null}
      </div>
    );
  };
}
