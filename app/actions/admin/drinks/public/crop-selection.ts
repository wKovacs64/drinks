import { assertNever } from "#/app/core/public/assert-never.ts";

export type Crop = { x: number; y: number; size: number };

export type Size = { width: number; height: number };

export type Point = { x: number; y: number };

export type CropHandle = "nw" | "ne" | "se" | "sw";

export type CropTarget = "image" | "crop" | CropHandle;

export type Arrow = "left" | "right" | "up" | "down";

export type CropGesture = {
  target: CropTarget;
  pointerId: number;
  origin: Point;
  startingCrop: Crop;
};

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
  | { type: "gestureEnded"; pointerId: number }
  | { type: "arrowPressed"; target: Exclude<CropTarget, "image">; arrow: Arrow; step: number };

export const emptyCropSelection: CropSelection = { status: "empty" };

const handleOutwardDirections = {
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

function resizeCrop(crop: Crop, bounds: Size, handle: CropHandle, delta: number): Crop {
  const west = handleOutwardDirections[handle].x < 0,
    north = handleOutwardDirections[handle].y < 0;

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
      return resizeCrop(
        gesture.startingCrop,
        bounds,
        gesture.target,
        deltaX * handleOutwardDirections[gesture.target].x,
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
  const outward = handleOutwardDirections[target];

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
