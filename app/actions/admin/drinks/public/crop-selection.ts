import { assertNever } from "#/app/core/public/assert-never.ts";

/** A square in displayed image pixels, from the image's top-left corner. */
export type Crop = { x: number; y: number; size: number };

export type Size = { width: number; height: number };

/** A position in displayed image pixels, relative to the image's top-left corner. */
export type Point = { x: number; y: number };

export type CropHandle = "nw" | "ne" | "se" | "sw";

/** A pointer on the image draws a new crop; on the crop it moves it; on a handle it resizes from that corner. */
export type CropTarget = "image" | "crop" | CropHandle;

export type Arrow = "left" | "right" | "up" | "down";

/** An active pointer gesture, owned by the pointer that started it. */
export type CropGesture = {
  target: CropTarget;
  pointerId: number;
  /** Where the pointer went down; a draw clamps it to the image. */
  origin: Point;
  /** The crop when the gesture started; moves and resizes are relative to it. */
  startingCrop: Crop;
};

/** The chosen file, from its object URL through a crop sized to the displayed image. */
export type CropSelection =
  | { status: "empty" }
  | { status: "loading"; objectUrl: string }
  | {
      status: "ready";
      objectUrl: string;
      crop: Crop;
      displayedSize: Size;
      gesture: CropGesture | undefined;
    };

export type CropSelectionEvent =
  | { type: "imageChosen"; objectUrl: string }
  | { type: "imageLoaded"; displayedSize: Size }
  | { type: "imageResized"; displayedSize: Size }
  | { type: "imageCleared" }
  | { type: "gestureStarted"; target: CropTarget; pointerId: number; point: Point }
  | { type: "pointerMoved"; pointerId: number; point: Point }
  /** The pointer was released or its gesture was cancelled. */
  | { type: "gestureEnded"; pointerId: number }
  | { type: "arrowPressed"; target: Exclude<CropTarget, "image">; arrow: Arrow; step: number };

export const emptyCropSelection: CropSelection = { status: "empty" };

/** Each handle's outward direction: dragging or pressing an arrow that way grows the crop. */
const handleDirections = {
  nw: { x: -1, y: -1 },
  ne: { x: 1, y: -1 },
  se: { x: 1, y: 1 },
  sw: { x: -1, y: 1 },
} satisfies Record<CropHandle, Point>;

const arrowDirections = {
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
} satisfies Record<Arrow, Point>;

function clamp(value: number, minimum: number, maximum: number) {
  return Math.max(minimum, Math.min(maximum, value));
}

function initialCrop({ width, height }: Size): Crop {
  const size = Math.min(width * 0.9, height);

  return { x: (width - size) / 2, y: (height - size) / 2, size };
}

/** Rescales the crop to a new displayed size of the same image. */
function rescaleCrop(crop: Crop, previous: Size, { width, height }: Size): Crop {
  const scale = width / previous.width;
  const size = Math.min(crop.size * scale, width, height);

  return {
    size,
    x: Math.min(width - size, crop.x * scale),
    y: Math.min(height - size, (crop.y * height) / previous.height),
  };
}

function moveCrop(crop: Crop, bounds: Size, deltaX: number, deltaY: number): Crop {
  return {
    size: crop.size,
    x: clamp(crop.x + deltaX, 0, bounds.width - crop.size),
    y: clamp(crop.y + deltaY, 0, bounds.height - crop.size),
  };
}

/** Grows or shrinks the crop by `delta` from a handle, keeping the opposite corner fixed. */
function resizeCrop(crop: Crop, bounds: Size, handle: CropHandle, delta: number): Crop {
  const west = handleDirections[handle].x < 0,
    north = handleDirections[handle].y < 0;

  const maximum = Math.min(
    west ? crop.x + crop.size : bounds.width - crop.x,
    north ? crop.y + crop.size : bounds.height - crop.y,
  );

  const size = clamp(crop.size + delta, 1, maximum);

  return {
    size,
    x: west ? crop.x + crop.size - size : crop.x,
    y: north ? crop.y + crop.size - size : crop.y,
  };
}

/** A square from the draw origin toward the pointer, sized by horizontal travel. */
function drawCrop(origin: Point, point: Point, bounds: Size): Crop {
  const deltaX = point.x - origin.x,
    deltaY = point.y - origin.y;

  const maximum = Math.min(
    deltaX < 0 ? origin.x : bounds.width - origin.x,
    deltaY < 0 ? origin.y : bounds.height - origin.y,
  );

  const size = clamp(Math.abs(deltaX), 1, maximum);

  return {
    size,
    x: deltaX < 0 ? origin.x - size : origin.x,
    y: deltaY < 0 ? origin.y - size : origin.y,
  };
}

function dragCrop(gesture: CropGesture, point: Point, bounds: Size): Crop {
  const deltaX = point.x - gesture.origin.x,
    deltaY = point.y - gesture.origin.y;

  switch (gesture.target) {
    case "image":
      return drawCrop(gesture.origin, point, bounds);
    case "crop":
      return moveCrop(gesture.startingCrop, bounds, deltaX, deltaY);
    default:
      // A corner handle resizes by horizontal travel only.
      return resizeCrop(
        gesture.startingCrop,
        bounds,
        gesture.target,
        deltaX * handleDirections[gesture.target].x,
      );
  }
}

function nudgeCrop(
  crop: Crop,
  bounds: Size,
  target: Exclude<CropTarget, "image">,
  arrow: Arrow,
  step: number,
): Crop {
  const direction = arrowDirections[arrow];

  if (target === "crop") return moveCrop(crop, bounds, direction.x * step, direction.y * step);
  const outward = handleDirections[target];

  return resizeCrop(
    crop,
    bounds,
    target,
    step * (direction.x * outward.x + direction.y * outward.y),
  );
}

export function transitionCropSelection(
  selection: CropSelection,
  event: CropSelectionEvent,
): CropSelection {
  switch (event.type) {
    case "imageChosen":
      return { status: "loading", objectUrl: event.objectUrl };

    case "imageCleared":
      return selection.status === "empty" ? selection : emptyCropSelection;

    case "imageLoaded":
      if (selection.status === "empty") return selection;

      return {
        status: "ready",
        objectUrl: selection.objectUrl,
        crop: initialCrop(event.displayedSize),
        displayedSize: event.displayedSize,
        gesture: undefined,
      };

    case "imageResized": {
      const { width, height } = event.displayedSize;

      if (selection.status !== "ready" || width === 0 || height === 0) return selection;
      const previous = selection.displayedSize;

      if (width === previous.width && height === previous.height) return selection;

      // An active gesture's origin and starting crop are in the old size, so the resize ends it.
      return {
        ...selection,
        crop: rescaleCrop(selection.crop, previous, event.displayedSize),
        displayedSize: event.displayedSize,
        gesture: undefined,
      };
    }

    case "gestureStarted": {
      if (selection.status !== "ready" || selection.gesture) return selection;
      const { width, height } = selection.displayedSize;

      return {
        ...selection,
        gesture: {
          target: event.target,
          pointerId: event.pointerId,
          origin:
            event.target === "image"
              ? { x: clamp(event.point.x, 0, width), y: clamp(event.point.y, 0, height) }
              : event.point,
          startingCrop: selection.crop,
        },
      };
    }

    case "pointerMoved":
      if (selection.status !== "ready" || selection.gesture?.pointerId !== event.pointerId)
        return selection;

      return {
        ...selection,
        crop: dragCrop(selection.gesture, event.point, selection.displayedSize),
      };

    case "gestureEnded":
      if (selection.status !== "ready" || selection.gesture?.pointerId !== event.pointerId)
        return selection;

      return { ...selection, gesture: undefined };

    case "arrowPressed":
      if (selection.status !== "ready") return selection;

      return {
        ...selection,
        crop: nudgeCrop(
          selection.crop,
          selection.displayedSize,
          event.target,
          event.arrow,
          event.step,
        ),
      };

    default:
      return assertNever(event);
  }
}

/** The crop in natural image pixels, for drawing the chosen image onto a canvas. */
export function cropSourceRect(
  selection: Extract<CropSelection, { status: "ready" }>,
  naturalSize: Size,
): Crop {
  const { crop, displayedSize } = selection;
  const scale = naturalSize.width / displayedSize.width;

  return {
    x: crop.x * scale,
    y: (crop.y * naturalSize.height) / displayedSize.height,
    size: crop.size * scale,
  };
}
