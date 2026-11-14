// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, it, vi } from "vitest";
import DisplayNameInput from "./DisplayNameInput";
const lookup = vi.hoisted(() => vi.fn());
vi.mock("../data/factory", () => ({ getProfileRepo: () => ({ getProfileByName: lookup }) }));
(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;
let cleanup = () => {};
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.clearAllMocks();
});
it("debounces lookup and ignores a stale response after the name changes", async () => {
  vi.useFakeTimers();
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  cleanup = () => {
    act(() => root.unmount());
    container.remove();
  };
  const render = (value: string) =>
    act(() =>
      root.render(
        createElement(DisplayNameInput, {
          value,
          profileId: "me",
          currentName: "Original",
          onChange: () => {},
        }),
      ),
    );
  let resolveOld!: (value: unknown) => void;
  lookup
    .mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveOld = resolve;
        }),
    )
    .mockResolvedValueOnce({ id: "other" });
  render("First");
  await act(async () => {
    await vi.advanceTimersByTimeAsync(399);
  });
  expect(lookup).not.toHaveBeenCalled();
  render("Second");
  await act(async () => {
    await vi.advanceTimersByTimeAsync(400);
  });
  expect(lookup).toHaveBeenCalledExactlyOnceWith("Second");
  render("Third");
  await act(async () => {
    resolveOld(null);
  });
  expect(container.textContent).toContain("Checking");
  await act(async () => {
    await vi.advanceTimersByTimeAsync(400);
  });
  expect(container.querySelector("input")?.getAttribute("aria-invalid")).toBe("true");
  expect(container.textContent).toContain("already taken");
});

it("reports status changes to the parent through onStatusChange", async () => {
  vi.useFakeTimers();
  const report = vi.fn();
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  cleanup = () => {
    act(() => root.unmount());
    container.remove();
  };
  const render = (value: string) =>
    act(() =>
      root.render(
        createElement(DisplayNameInput, {
          value,
          profileId: "",
          currentName: "",
          onChange: () => {},
          onStatusChange: report,
        }),
      ),
    );
  lookup.mockResolvedValueOnce({ id: "someone-else" }).mockResolvedValueOnce(null);
  render("taken-name");
  await act(async () => {
    await vi.advanceTimersByTimeAsync(400);
  });
  expect(report).toHaveBeenLastCalledWith("taken");
  render("free-name");
  await act(async () => {
    await vi.advanceTimersByTimeAsync(400);
  });
  expect(report).toHaveBeenLastCalledWith("available");
});
