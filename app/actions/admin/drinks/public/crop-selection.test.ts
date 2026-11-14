import { test } from "remix/test";
import { expect } from "remix/assert";
import {
  cropSourceRect,
  emptyCropSelection,
  transitionCropSelection,
  type Arrow,
  type Crop,
  type CropHandle,
  type CropSelection,
  type CropSelectionEvent,
} from "./crop-selection.ts";

function run(events: CropSelectionEvent[], selection: CropSelection = emptyCropSelection) {
  return events.reduce(transitionCropSelection, selection);
}

function readyWith(crop: Crop): CropSelection {
  return {
    status: "ready",
    objectUrl: "blob:first",
    crop,
    displayedSize: { width: 400, height: 300 },
    gesture: undefined,
  };
}

function cropOf(selection: CropSelection) {
  if (selection.status !== "ready")
    throw new Error(`Expected a ready crop, got ${selection.status}`);

  return selection.crop;
}

const loaded = run([
  { type: "imageChosen", objectUrl: "blob:first" },
  { type: "imageLoaded", displayedSize: { width: 400, height: 300 } },
]);

const moving = transitionCropSelection(loaded, {
  type: "gestureStarted",
  target: "crop",
  pointerId: 1,
  point: { x: 200, y: 150 },
});

test("a loaded image starts with a centred crop of 90% of its width, capped by its height", () => {
  expect(cropOf(loaded)).toEqual({ x: 50, y: 0, size: 300 });
  expect(
    cropOf(
      run([
        { type: "imageChosen", objectUrl: "blob:portrait" },
        { type: "imageLoaded", displayedSize: { width: 200, height: 400 } },
      ]),
    ),
  ).toEqual({ x: 10, y: 110, size: 180 });
});

test("a displayed-size change rescales the crop and keeps it inside the image", () => {
  const selection = readyWith({ x: 300, y: 200, size: 100 });

  expect(
    transitionCropSelection(selection, {
      type: "imageResized",
      displayedSize: { width: 200, height: 150 },
    }),
  ).toEqual({
    ...selection,
    crop: { x: 150, y: 100, size: 50 },
    displayedSize: { width: 200, height: 150 },
  });
  // Height rounds independently of width, so the vertical position scales by height and clamps.
  expect(
    cropOf(
      transitionCropSelection(selection, {
        type: "imageResized",
        displayedSize: { width: 200, height: 149 },
      }),
    ),
  ).toEqual({ x: 150, y: 99, size: 50 });

  for (const displayedSize of [
    { width: 400, height: 300 },
    { width: 0, height: 150 },
  ]) {
    expect(transitionCropSelection(selection, { type: "imageResized", displayedSize })).toBe(
      selection,
    );
  }
});

test("the source rectangle maps the displayed crop to natural image pixels", () => {
  const landscape: CropSelection = {
    status: "ready",
    objectUrl: "blob:landscape",
    crop: { x: 10, y: 20, size: 50 },
    displayedSize: { width: 300, height: 200 },
    gesture: undefined,
  };

  expect(cropSourceRect(landscape, { width: 1200, height: 800 })).toEqual({
    x: 40,
    y: 80,
    size: 200,
  });

  const portrait: CropSelection = {
    status: "ready",
    objectUrl: "blob:portrait",
    crop: { x: 20, y: 100, size: 200 },
    displayedSize: { width: 240, height: 400 },
    gesture: undefined,
  };

  expect(cropSourceRect(portrait, { width: 600, height: 1000 })).toEqual({
    x: 50,
    y: 250,
    size: 500,
  });
});

test("a gesture does not survive its image being cleared, replaced, or resized", () => {
  const replacements = [
    run(
      [
        { type: "imageCleared" },
        { type: "imageChosen", objectUrl: "blob:second" },
        { type: "imageLoaded", displayedSize: { width: 400, height: 300 } },
      ],
      moving,
    ),
    run(
      [
        { type: "imageChosen", objectUrl: "blob:second" },
        { type: "imageLoaded", displayedSize: { width: 400, height: 300 } },
      ],
      moving,
    ),
    transitionCropSelection(moving, {
      type: "imageResized",
      displayedSize: { width: 200, height: 150 },
    }),
  ];

  for (const replacement of replacements) {
    expect(
      transitionCropSelection(replacement, {
        type: "pointerMoved",
        pointerId: 1,
        point: { x: 230, y: 180 },
      }),
    ).toBe(replacement);
  }
});

function moveTo(pointerId: number, x: number): CropSelectionEvent {
  return { type: "pointerMoved", pointerId, point: { x, y: 150 } };
}

test("pointer moves outside the gesture's pointer and lifetime are ignored", () => {
  expect(transitionCropSelection(loaded, moveTo(1, 210))).toBe(loaded);

  const ended = run([moveTo(1, 210), { type: "gestureEnded", pointerId: 1 }], moving);

  expect(cropOf(ended)).toEqual({ x: 60, y: 0, size: 300 });
  expect(transitionCropSelection(ended, moveTo(1, 250))).toBe(ended);

  // A second pointer can neither take over, move, nor end the first pointer's gesture.
  for (const event of [
    { type: "gestureStarted", target: "se", pointerId: 2, point: { x: 350, y: 300 } },
    moveTo(2, 250),
    { type: "gestureEnded", pointerId: 2 },
  ] satisfies CropSelectionEvent[]) {
    expect(transitionCropSelection(moving, event)).toBe(moving);
  }

  expect(cropOf(transitionCropSelection(moving, moveTo(1, 190)))).toEqual({
    x: 40,
    y: 0,
    size: 300,
  });
});

test("a draw anchors at the image edge when it starts outside the image", () => {
  const drawn = run(
    [
      { type: "gestureStarted", target: "image", pointerId: 1, point: { x: -5, y: 500 } },
      { type: "pointerMoved", pointerId: 1, point: { x: 50, y: 250 } },
    ],
    loaded,
  );

  expect(cropOf(drawn)).toEqual({ x: 0, y: 250, size: 50 });
});

test("arrow keys move the crop by the pressed step", () => {
  const selection = readyWith({ x: 100, y: 100, size: 100 });

  for (const [arrow, crop] of [
    ["left", { x: 90, y: 100, size: 100 }],
    ["right", { x: 110, y: 100, size: 100 }],
    ["up", { x: 100, y: 90, size: 100 }],
    ["down", { x: 100, y: 110, size: 100 }],
  ] satisfies [Arrow, Crop][]) {
    expect(
      cropOf(
        transitionCropSelection(selection, {
          type: "arrowPressed",
          target: "crop",
          arrow,
          step: 10,
        }),
      ),
    ).toEqual(crop);
  }
});

test("each handle grows outward and shrinks inward around its opposite corner", () => {
  const selection = readyWith({ x: 100, y: 100, size: 100 });

  const handleCases: {
    handle: CropHandle;
    outward: Arrow[];
    inward: Arrow[];
    grown: Crop;
    shrunk: Crop;
  }[] = [
    {
      handle: "nw",
      outward: ["left", "up"],
      inward: ["right", "down"],
      grown: { x: 90, y: 90, size: 110 },
      shrunk: { x: 110, y: 110, size: 90 },
    },
    {
      handle: "ne",
      outward: ["right", "up"],
      inward: ["left", "down"],
      grown: { x: 100, y: 90, size: 110 },
      shrunk: { x: 100, y: 110, size: 90 },
    },
    {
      handle: "se",
      outward: ["right", "down"],
      inward: ["left", "up"],
      grown: { x: 100, y: 100, size: 110 },
      shrunk: { x: 100, y: 100, size: 90 },
    },
    {
      handle: "sw",
      outward: ["left", "down"],
      inward: ["right", "up"],
      grown: { x: 90, y: 100, size: 110 },
      shrunk: { x: 110, y: 100, size: 90 },
    },
  ];

  for (const { handle, outward, inward, grown, shrunk } of handleCases) {
    const press = (arrow: Arrow) =>
      cropOf(
        transitionCropSelection(selection, {
          type: "arrowPressed",
          target: handle,
          arrow,
          step: 10,
        }),
      );

    for (const arrow of outward) expect(press(arrow)).toEqual(grown);

    for (const arrow of inward) expect(press(arrow)).toEqual(shrunk);

    // A pointer resizes by horizontal travel only.
    const outwardX = outward.includes("left") ? -10 : 10;

    const dragged = run(
      [
        { type: "gestureStarted", target: handle, pointerId: 1, point: { x: 200, y: 200 } },
        { type: "pointerMoved", pointerId: 1, point: { x: 200 + outwardX, y: 237 } },
      ],
      selection,
    );

    expect(cropOf(dragged)).toEqual(grown);
  }
});
