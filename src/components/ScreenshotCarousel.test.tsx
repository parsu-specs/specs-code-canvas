// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ScreenshotCarousel from "./ScreenshotCarousel";

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});

async function render(images = ["/one.webp", "/two.webp"]) {
  const onOpen = vi.fn();
  await act(async () => {
    root.render(<ScreenshotCarousel title="Demo" images={images} onOpen={onOpen} />);
  });
  return onOpen;
}

describe("ScreenshotCarousel", () => {
  it("omits an empty gallery and hides navigation for a single screenshot", async () => {
    await render([]);
    expect(container.querySelector("section")).toBeNull();
    const onOpen = await render(["/one.webp"]);
    expect(container.querySelector('[aria-label="Next screenshot"]')).toBeNull();
    await act(async () => container.querySelector("button")!.click());
    expect(onOpen).toHaveBeenCalledWith(0);
  });

  it("keeps arrow controls and keyboard navigation in sync with swiping", async () => {
    await render();
    const track = container.querySelector('[tabindex="0"]') as HTMLDivElement;
    Array.from(track.children).forEach((slide, index) => {
      Object.defineProperty(slide, "offsetLeft", { value: 20 + index * 300 });
    });
    const scrollTo = vi.fn();
    track.scrollTo = scrollTo;
    const previous = container.querySelector(
      '[aria-label="Previous screenshot"]',
    ) as HTMLButtonElement;
    const next = container.querySelector('[aria-label="Next screenshot"]') as HTMLButtonElement;
    expect(previous.disabled).toBe(true);
    await act(async () => next.click());
    expect(scrollTo).toHaveBeenLastCalledWith({ left: 300 });

    await act(async () => {
      track.scrollLeft = 300;
      track.dispatchEvent(new Event("scroll"));
    });
    expect(next.disabled).toBe(true);
    expect(previous.disabled).toBe(false);
    expect(container.querySelector('[aria-live="polite"]')!.textContent).toBe("2 / 2");

    await act(async () => {
      track.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true }));
    });
    expect(scrollTo).toHaveBeenLastCalledWith({ left: 0 });
  });

  it("opens the selected screenshot at its gallery index", async () => {
    const onOpen = await render();
    await act(async () => {
      (
        container.querySelector(
          '[aria-label="View Demo screenshot 2 full size"]',
        ) as HTMLButtonElement
      ).click();
    });
    expect(onOpen).toHaveBeenCalledWith(1);
  });
});
