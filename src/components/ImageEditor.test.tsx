// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import ImageEditor from "./ImageEditor";
import { heicTo } from "heic-to/csp";

vi.mock("heic-to/csp", () => ({ heicTo: vi.fn() }));

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root;
let container: HTMLDivElement;
let images: HTMLImageElement[];
const original = new File(["image"], "photo.jpg", { type: "image/jpeg" });

beforeEach(() => {
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  images = [];
  vi.stubGlobal(
    "Image",
    vi.fn(function () {
      const image = document.createElement("img");
      Object.defineProperties(image, {
        naturalWidth: { value: 800 },
        naturalHeight: { value: 600 },
      });
      images.push(image);
      return image;
    }),
  );
  vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:test-image");
  vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
    clearRect: vi.fn(),
    save: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
    drawImage: vi.fn(),
    restore: vi.fn(),
  } as unknown as CanvasRenderingContext2D);
  vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation((callback, type) =>
    callback(new Blob(["crop"], { type })),
  );
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.restoreAllMocks();
  vi.resetAllMocks();
  vi.unstubAllGlobals();
});

function button(text: string) {
  return Array.from(container.querySelectorAll("button")).find(
    (element) => element.textContent?.trim() === text,
  )!;
}

it("keeps save disabled until loaded, exports a File, and cancels without saving", async () => {
  const onSave = vi.fn();
  const onCancel = vi.fn();
  act(() => root.render(<ImageEditor file={original} onSave={onSave} onCancel={onCancel} />));
  expect(button("Use image").disabled).toBe(true);
  act(() => images[0].dispatchEvent(new Event("load")));
  expect(button("Use image").disabled).toBe(false);
  await act(async () => button("Use image").click());
  expect(onSave).toHaveBeenCalledOnce();
  expect(onSave.mock.calls[0][0]).toBeInstanceOf(File);
  act(() => button("Cancel").click());
  expect(onCancel).toHaveBeenCalledOnce();
  expect(onSave).toHaveBeenCalledOnce();
});

it("clears the old preview and releases the URL when the selected file changes", () => {
  const props = { onSave: vi.fn(), onCancel: vi.fn() };
  act(() => root.render(<ImageEditor file={original} {...props} />));
  act(() => images[0].dispatchEvent(new Event("load")));
  const replacement = new File(["next"], "next.png", { type: "image/png" });
  act(() => root.render(<ImageEditor file={replacement} {...props} />));
  expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:test-image");
  expect(button("Use image").disabled).toBe(true);
  expect(container.querySelector("canvas")?.hidden).toBe(true);
});

it("preserves the editor for retry when the save callback fails", async () => {
  const onSave = vi
    .fn()
    .mockRejectedValueOnce(new Error("Upload failed"))
    .mockResolvedValue(undefined);
  act(() => root.render(<ImageEditor file={original} onSave={onSave} onCancel={vi.fn()} />));
  act(() => images[0].dispatchEvent(new Event("load")));
  await act(async () => button("Use image").click());
  expect(container.querySelector('[role="alert"]')?.textContent).toContain("try again");
  expect(button("Use image").disabled).toBe(false);
  await act(async () => button("Use image").click());
  expect(onSave).toHaveBeenCalledTimes(2);
  expect(container.querySelector('[role="alert"]')).toBeNull();
});

it("reports invalid ratios without attempting to decode an image", () => {
  act(() =>
    root.render(
      <ImageEditor file={original} aspectRatio={NaN} onSave={vi.fn()} onCancel={vi.fn()} />,
    ),
  );
  expect(container.querySelector('[role="alert"]')?.textContent).toContain("aspect ratio");
  expect(URL.createObjectURL).not.toHaveBeenCalled();
});

function enterNumber(input: HTMLInputElement, value: string) {
  act(() => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

it("synchronizes number inputs with sliders, clamps values, and resets adjustments", () => {
  act(() => root.render(<ImageEditor file={original} onSave={vi.fn()} onCancel={vi.fn()} />));
  act(() => images[0].dispatchEvent(new Event("load")));
  const zoom = container.querySelector('[aria-label="Zoom percentage"]') as HTMLInputElement;
  const x = container.querySelector(
    '[aria-label="Horizontal position percentage"]',
  ) as HTMLInputElement;
  const sliders = container.querySelectorAll<HTMLInputElement>('input[type="range"]');
  enterNumber(zoom, "175");
  expect(sliders[0].value).toBe("1.75");
  enterNumber(x, "-50");
  expect(sliders[1].value).toBe("-0.5");
  enterNumber(zoom, "999");
  expect(sliders[0].value).toBe("3");
  enterNumber(zoom, "");
  expect(sliders[0].value).toBe("3");
  act(() => button("Reset").click());
  expect(zoom.value).toBe("100");
  expect(x.value).toBe("0");
  expect(sliders[0].value).toBe("1");
});

it("prepares HEIC files before previewing them", async () => {
  const converted = new Blob(["pixels"], { type: "image/png" });
  vi.mocked(heicTo).mockResolvedValueOnce(converted);
  await act(async () =>
    root.render(
      <ImageEditor
        file={new File(["heic"], "photo.heic", { type: "image/heic" })}
        onSave={vi.fn()}
        onCancel={vi.fn()}
      />,
    ),
  );
  expect(URL.createObjectURL).toHaveBeenCalledWith(converted);
  act(() => images[0].dispatchEvent(new Event("load")));
  expect(button("Use image").disabled).toBe(false);
});

it("does not create a preview URL if a slow HEIC conversion finishes after replacement", async () => {
  let finish!: (blob: Blob) => void;
  vi.mocked(heicTo).mockReturnValueOnce(
    new Promise((resolve) => {
      finish = resolve;
    }),
  );
  const props = { onSave: vi.fn(), onCancel: vi.fn() };
  await act(async () =>
    root.render(
      <ImageEditor file={new File(["heic"], "photo.heic", { type: "image/heic" })} {...props} />,
    ),
  );
  act(() => root.render(<ImageEditor file={original} {...props} />));
  await act(async () => finish(new Blob(["old pixels"], { type: "image/png" })));
  expect(URL.createObjectURL).toHaveBeenCalledExactlyOnceWith(original);
});
