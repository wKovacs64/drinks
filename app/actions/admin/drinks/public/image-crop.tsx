import { css, on, ref, type Handle } from "remix/component";
import { Image } from "#/app/ui/images/public/image.tsx";
import {
  cropSourceRect,
  emptyCropSelection,
  transitionCropSelection,
  type Arrow,
  type CropHandle,
  type CropSelection,
  type CropSelectionEvent,
  type CropTarget,
} from "./crop-selection.ts";

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

const cropHandles = [
  {
    handle: "nw",
    name: "north west",
    positionClasses: "top-0 left-0 -translate-x-1/2 -translate-y-1/2 cursor-nw-resize",
  },
  {
    handle: "ne",
    name: "north east",
    positionClasses: "top-0 right-0 translate-x-1/2 -translate-y-1/2 cursor-ne-resize",
  },
  {
    handle: "se",
    name: "south east",
    positionClasses: "bottom-0 right-0 translate-x-1/2 translate-y-1/2 cursor-se-resize",
  },
  {
    handle: "sw",
    name: "south west",
    positionClasses: "bottom-0 left-0 -translate-x-1/2 translate-y-1/2 cursor-sw-resize",
  },
] as const satisfies readonly { handle: CropHandle; name: string; positionClasses: string }[];

const arrowKeys = new Map<string, Arrow>([
  ["ArrowLeft", "left"],
  ["ArrowRight", "right"],
  ["ArrowUp", "up"],
  ["ArrowDown", "down"],
]);

function keyboardStep(event: KeyboardEvent) {
  if (navigator.platform.includes("Mac") ? event.metaKey : event.ctrlKey) return 100;

  return event.shiftKey ? 10 : 1;
}

function getDisplayedSize(image: HTMLImageElement) {
  return { width: image.width, height: image.height };
}

function getPointOnImage(image: HTMLImageElement, event: PointerEvent) {
  const bounds = image.getBoundingClientRect();

  return { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
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
  let selection = emptyCropSelection;
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

  function send(event: CropSelectionEvent) {
    const previous = selection;
    selection = transitionCropSelection(selection, event);

    if (selection === previous) return;
    const previousObjectUrl = getObjectUrl(previous);

    if (previousObjectUrl && previousObjectUrl !== getObjectUrl(selection))
      URL.revokeObjectURL(previousObjectUrl);
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
    const image = imageElement;

    const source = cropSourceRect(selection, {
      width: image.naturalWidth,
      height: image.naturalHeight,
    });

    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = source.size;
    const context = canvas.getContext("2d");

    if (!context) return null;
    context.drawImage(
      image,
      source.x,
      source.y,
      source.size,
      source.size,
      0,
      0,
      canvas.width,
      canvas.height,
    );

    return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.9));
  });

  function startGesture(event: PointerEvent & { currentTarget: Element }, target: CropTarget) {
    if (!imageElement || selection.status !== "ready") return;
    event.preventDefault();

    // Moves and resizes keep their press; a handle sits inside the crop, which would start a move.
    if (target !== "image") event.stopPropagation();

    event.currentTarget.setPointerCapture(event.pointerId);
    send({
      type: "gestureStarted",
      target,
      pointerId: event.pointerId,
      point: getPointOnImage(imageElement, event),
    });
  }

  function pressArrow(event: KeyboardEvent, target: Exclude<CropTarget, "image">) {
    const arrow = arrowKeys.get(event.key);

    if (!arrow) return;
    event.preventDefault();

    // A handle sits inside the crop, which would otherwise move.
    if (target !== "crop") event.stopPropagation();

    send({ type: "arrowPressed", target, arrow, step: keyboardStep(event) });
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
            send({ type: "imageChosen", objectUrl: URL.createObjectURL(file) });
          }),
        ]}
      />
    );

    const changeButton = (
      <button
        type="button"
        mix={on("click", () => {
          if (fileInput) fileInput.value = "";
          send({ type: "imageCleared" });
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
            <div
              className="relative inline-block max-h-96 max-w-full cursor-crosshair"
              mix={[
                // Captured pointers bubble here from whichever part started the gesture.
                on("pointermove", (event) => {
                  if (event instanceof PointerEvent && imageElement)
                    send({
                      type: "pointerMoved",
                      pointerId: event.pointerId,
                      point: getPointOnImage(imageElement, event),
                    });
                }),
                on("pointerup", (event) => {
                  if (event instanceof PointerEvent)
                    send({ type: "gestureEnded", pointerId: event.pointerId });
                }),
                on("pointercancel", (event) => {
                  if (event instanceof PointerEvent)
                    send({ type: "gestureEnded", pointerId: event.pointerId });
                }),
              ]}
            >
              <div
                className="max-h-[inherit] overflow-hidden"
                mix={on("pointerdown", (event) => {
                  if (event instanceof PointerEvent && event.button === 0)
                    startGesture(event, "image");
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
                        send({ type: "imageLoaded", displayedSize: getDisplayedSize(element) });

                      const observer = new ResizeObserver(() =>
                        send({ type: "imageResized", displayedSize: getDisplayedSize(element) }),
                      );

                      observer.observe(element);
                      signal.addEventListener("abort", () => observer.disconnect(), { once: true });
                    }),
                    on<HTMLImageElement, "load">("load", (event) =>
                      send({
                        type: "imageLoaded",
                        displayedSize: getDisplayedSize(event.currentTarget),
                      }),
                    ),
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
                    on("pointerdown", (event) => {
                      if (event instanceof PointerEvent) startGesture(event, "crop");
                    }),
                    on("keydown", (event) => {
                      if (event instanceof KeyboardEvent) pressArrow(event, "crop");
                    }),
                  ]}
                >
                  <div>
                    {cropHandles.map(({ handle: cropHandle, name, positionClasses }) => (
                      <div
                        key={cropHandle}
                        className={`absolute size-3 border border-[#ffffffb3] bg-[#0003] focus:bg-[#08f] [@media(pointer:coarse)]:size-6 ${positionClasses}`}
                        tabIndex={0}
                        role="button"
                        aria-label={`Use the arrow keys to move the ${name} drag handle to change the crop selection area`}
                        mix={[
                          on("pointerdown", (event) => {
                            if (event instanceof PointerEvent) startGesture(event, cropHandle);
                          }),
                          on("keydown", (event) => {
                            if (event instanceof KeyboardEvent) pressArrow(event, cropHandle);
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
