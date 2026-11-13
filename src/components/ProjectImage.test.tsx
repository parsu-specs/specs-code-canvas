// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { Simulate } from "react-dom/test-utils";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import ProjectImage from "./ProjectImage";

const cover = "https://images.example/storage/v1/object/public/project-images/u1/v1/image-1/cover";
const src = `${cover}#w=1600&h=900&tw=768&th=432`;
let container: HTMLDivElement, root: Root;
beforeEach(() => {
  vi.stubEnv("VITE_SUPABASE_URL", "https://images.example");
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

it("requests only the small thumbnail in a card, with intrinsic dimensions", async () => {
  await act(async () => root.render(<ProjectImage src={src} alt="Screenshot" />));
  const img = container.querySelector("img")!;
  expect(img.src).toBe(cover.replace(/cover$/, "thumbnail"));
  expect(img.getAttribute("srcset")).toBeNull();
  expect(img.width).toBe(768);
  expect(img.height).toBe(432);
});

it("preserves fetch priority without React DOM warnings", async () => {
  const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
  try {
    for (const priority of ["high", "auto", undefined] as const) {
      await act(async () =>
        root.render(<ProjectImage src={src} alt="Screenshot" fetchPriority={priority} />),
      );
      expect(container.querySelector("img")?.getAttribute("fetchpriority")).toBe(priority ?? null);
    }
    expect(consoleError).not.toHaveBeenCalled();
  } finally {
    consoleError.mockRestore();
  }
});

it("offers responsive cover sizes and keeps full images available for a viewer", async () => {
  await act(async () => root.render(<ProjectImage src={src} variant="cover" alt="Screenshot" />));
  expect(container.querySelector("img")?.getAttribute("srcset")).toContain("768w");
  expect(container.querySelector("img")?.getAttribute("sizes")).toContain("100vw - 32px");
  await act(async () => root.render(<ProjectImage src={src} variant="full" alt="Screenshot" />));
  expect(container.querySelector("img")?.src).toBe(cover);
  expect(container.querySelector("img")?.getAttribute("srcset")).toBeNull();
});

it("falls back to a cover if a thumbnail was removed, without an infinite retry", async () => {
  const onError = vi.fn();
  await act(async () => root.render(<ProjectImage src={src} onError={onError} alt="Screenshot" />));
  await act(async () => Simulate.error(container.querySelector("img")!));
  expect(container.querySelector("img")?.src).toBe(cover);
  expect(onError).not.toHaveBeenCalled();
  await act(async () => Simulate.error(container.querySelector("img")!));
  expect(onError).toHaveBeenCalledOnce();
});
