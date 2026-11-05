// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { LoadingRegion, SkeletonBlock } from "./Skeleton";

let root: Root;
let container: HTMLDivElement;
beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

it("keeps fast-loading placeholders visually and semantically hidden, reserving their layout", async () => {
  await act(async () =>
    root.render(
      <LoadingRegion label="Loading projects">
        <SkeletonBlock className="h-48" />
      </LoadingRegion>,
    ),
  );
  await act(async () => vi.advanceTimersByTime(100));
  expect(container.querySelector('[role="status"]')).toBeNull();
  expect(container.querySelector("[data-loading-placeholder]")?.className).toContain("invisible");
  expect(container.querySelector(".h-48")).not.toBeNull();
  await act(async () => root.render(<div>Projects ready</div>));
  expect(vi.getTimerCount()).toBe(0);
  await act(async () => vi.advanceTimersByTime(500));
  expect(container.textContent).toBe("Projects ready");
});

it("reveals a fading, accessible loading state only after the delay", async () => {
  await act(async () =>
    root.render(
      <LoadingRegion label="Loading projects">
        <SkeletonBlock />
      </LoadingRegion>,
    ),
  );
  await act(async () => vi.advanceTimersByTime(179));
  expect(container.querySelector('[role="status"]')).toBeNull();
  await act(async () => vi.advanceTimersByTime(1));
  const region = container.querySelector('[role="status"]');
  expect(region?.getAttribute("aria-label")).toBe("Loading projects");
  expect(region?.className).toContain("animate-placeholder-in");
  expect(region?.getAttribute("aria-hidden")).toBeNull();
});

it("keeps an already visible startup skeleton visible during the React handoff", async () => {
  await act(async () =>
    root.render(
      <LoadingRegion delay={0} label="Loading CodeCanvas">
        <SkeletonBlock />
      </LoadingRegion>,
    ),
  );
  const region = container.querySelector('[role="status"]');
  expect(region).not.toBeNull();
  expect(region?.className).not.toContain("invisible");
  expect(region?.className).not.toContain("animate-placeholder-in");
});
