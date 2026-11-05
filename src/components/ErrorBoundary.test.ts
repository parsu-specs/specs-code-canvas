// @vitest-environment jsdom
import { act, createElement, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { expect, it, vi } from "vitest";
import ErrorBoundary from "./ErrorBoundary";
import { lazyPage } from "../utils/lazyPage";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

it("offers document refresh for a failed page import instead of an ineffective render retry", async () => {
  const log = vi.spyOn(console, "error").mockImplementation(() => {});
  const load = vi
    .fn()
    .mockRejectedValue(new TypeError("Failed to fetch dynamically imported module"));
  const Page = lazyPage(load);
  // A failed speculative download must keep the same refresh-only recovery.
  await Page.preload().catch(() => undefined);
  const container = document.createElement("div");
  const root = createRoot(container);
  try {
    await act(async () => {
      root.render(
        createElement(ErrorBoundary, {
          name: "app",
          children: createElement(Suspense, { fallback: "Loading" }, createElement(Page)),
        }),
      );
    });
    expect(container.textContent).toContain("Refresh page");
    expect(container.textContent).not.toContain("Try again");
    expect(load).toHaveBeenCalledOnce();
  } finally {
    await act(async () => root.unmount());
    log.mockRestore();
  }
});

it("offers only document refresh after a section render crash", async () => {
  const log = vi.spyOn(console, "error").mockImplementation(() => {});
  function Section(): never {
    throw new Error("Section render failure");
  }
  const container = document.createElement("div");
  const root = createRoot(container);
  try {
    await act(async () =>
      root.render(
        createElement(ErrorBoundary, {
          name: "discover",
          children: createElement(Section),
        }),
      ),
    );
    expect(container.textContent).toContain("Refresh page");
    expect(container.querySelectorAll("button")).toHaveLength(1);
    expect(container.querySelector("button")?.textContent).toBe("Refresh page");
    expect(container.textContent).not.toContain("Try again");
  } finally {
    await act(async () => root.unmount());
    log.mockRestore();
  }
});

it("shares an early route download with the subsequent lazy render", async () => {
  const load = vi.fn(async () => ({ default: () => createElement("p", null, "Ready") }));
  const Page = lazyPage(load);
  const first = Page.preload();
  expect(Page.preload()).toBe(first);
  await first;
  const container = document.createElement("div");
  const root = createRoot(container);
  try {
    await act(async () =>
      root.render(createElement(Suspense, { fallback: "Loading" }, createElement(Page))),
    );
    expect(container.textContent).toBe("Ready");
    expect(load).toHaveBeenCalledOnce();
  } finally {
    await act(async () => root.unmount());
  }
});
