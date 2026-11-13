// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, it, vi } from "vitest";
import SortableThumbnails from "./SortableThumbnails";

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
