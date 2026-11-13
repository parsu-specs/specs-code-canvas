// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, it, vi } from "vitest";
import SortableThumbnails from "./SortableThumbnails";
import type { ImageEditorProps } from "./ImageEditor";

vi.mock("./ImageEditor", () => ({
  default: ({ onSave, onCancel }: ImageEditorProps) =>
    createElement(
      "div",
      null,
      createElement(
        "button",
        { onClick: () => onSave(new File(["edited"], "edit.png")) },
        "Save edit",
      ),
      createElement("button", { onClick: onCancel }, "Cancel edit"),
    ),
}));

vi.mock("../utils/images", () => ({
  fileToProjectImageDataUrl: vi.fn(async () => "data:image/jpeg;base64,RURJVA=="),
}));

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

const images = [
  "data:image/jpeg;base64,QUFB",
  "data:image/jpeg;base64,QkJC",
  "data:image/jpeg;base64,Q0ND",
];

let cleanup = () => {};
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

function renderSortable(onReorder = vi.fn(), onRemove = vi.fn()) {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  cleanup = () => {
    act(() => root.unmount());
    container.remove();
  };
  act(() => root.render(createElement(SortableThumbnails, { images, onReorder, onRemove })));
  return { container, onReorder, onRemove };
}

const tiles = (container: HTMLElement) =>
  Array.from(container.querySelectorAll('[role="listitem"]')) as HTMLElement[];

const dragEvent = (type: string, dataTransfer: unknown) =>
  Object.assign(new window.Event(type, { bubbles: true, cancelable: true }), { dataTransfer });

it("renders one tile per image with the cover badge only on the first", () => {
  const { container } = renderSortable();
  expect(tiles(container)).toHaveLength(3);
  const badges = Array.from(container.querySelectorAll("span")).filter(
    (el) => el.textContent === "COVER",
  );
  expect(badges).toHaveLength(1);
  expect(tiles(container)[0].contains(badges[0])).toBe(true);
});

it("reorders through native drag and drop", () => {
  const { container, onReorder } = renderSortable();
  const dataTransfer = { setData: vi.fn(), effectAllowed: "", dropEffect: "" };
  act(() => {
    tiles(container)[2].dispatchEvent(dragEvent("dragstart", dataTransfer));
  });
  act(() => {
    tiles(container)[0].dispatchEvent(dragEvent("dragover", dataTransfer));
  });
  act(() => {
    tiles(container)[0].dispatchEvent(dragEvent("drop", dataTransfer));
  });
  expect(onReorder).toHaveBeenCalledExactlyOnceWith([images[2], images[0], images[1]]);
});

it("ignores a drop without a preceding drag start", () => {
  const { container, onReorder } = renderSortable();
  const dataTransfer = { setData: vi.fn(), effectAllowed: "", dropEffect: "" };
  act(() => {
    tiles(container)[0].dispatchEvent(dragEvent("drop", dataTransfer));
  });
  expect(onReorder).not.toHaveBeenCalled();
});

it("removes through the remove button", () => {
  const { container, onRemove } = renderSortable();
  act(() => {
    (container.querySelector('[aria-label="Remove image 2"]') as HTMLElement).click();
  });
  expect(onRemove).toHaveBeenCalledExactlyOnceWith(1);
});

it("edits an existing thumbnail in place without changing the cover or other images", async () => {
  const fetchImage = vi.fn(async (_url: string) => ({
    ok: true,
    blob: async () => new Blob(["original"], { type: "image/png" }),
  }));
  vi.stubGlobal("fetch", fetchImage);
  const { container, onReorder } = renderSortable();
  await act(async () => {
    (container.querySelector('[aria-label="Edit image 2"]') as HTMLElement).click();
  });
  expect(fetchImage.mock.calls[0][0]).toBe(images[1]);
  expect(tiles(container).every((tile) => !tile.draggable)).toBe(true);
  await act(async () => {
    Array.from(container.querySelectorAll("button"))
      .find((button) => button.textContent === "Save edit")!
      .click();
  });
  expect(onReorder).toHaveBeenCalledExactlyOnceWith([
    images[0],
    "data:image/jpeg;base64,RURJVA==",
    images[2],
  ]);
  expect(container.textContent).not.toContain("Save edit");
});

it("leaves thumbnails unchanged when editing is cancelled", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({ ok: true, blob: async () => new Blob(["original"]) })),
  );
  const { container, onReorder } = renderSortable();
  await act(async () => {
    (container.querySelector('[aria-label="Edit image 1"]') as HTMLElement).click();
  });
  act(() => {
    Array.from(container.querySelectorAll("button"))
      .find((button) => button.textContent === "Cancel edit")!
      .click();
  });
  expect(onReorder).not.toHaveBeenCalled();
  expect(tiles(container).every((tile) => tile.draggable)).toBe(true);
});

it("shows a recoverable error when a thumbnail cannot be loaded", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response(null, { status: 404 })),
  );
  const { container, onReorder } = renderSortable();
  await act(async () => {
    (container.querySelector('[aria-label="Edit image 1"]') as HTMLElement).click();
  });
  expect(container.querySelector('[role="alert"]')?.textContent).toContain("Could not load");
  expect(onReorder).not.toHaveBeenCalled();
  act(() => {
    Array.from(container.querySelectorAll("button"))
      .find((button) => button.textContent === "Cancel")!
      .click();
  });
  expect(container.querySelector('[role="alert"]')).toBeNull();
});
