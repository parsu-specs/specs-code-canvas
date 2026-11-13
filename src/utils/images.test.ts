// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { encodeImage, imageDataUrlToBlob } from "./images";
import { heicTo } from "heic-to/csp";

vi.mock("heic-to/csp", () => ({ heicTo: vi.fn() }));

const bitmap = { width: 4000, height: 2000, close: vi.fn() };
const context = {
  drawImage: vi.fn(),
  fillRect: vi.fn(),
  fillStyle: "",
  globalCompositeOperation: "source-over",
};
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("createImageBitmap", vi.fn().mockResolvedValue(bitmap));
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(
    context as unknown as CanvasRenderingContext2D,
  );
  vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation(function (callback, type) {
    callback(new Blob(["optimized"], { type }));
  });
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

it("encodes a 1600px WebP cover while preserving aspect ratio and releasing its bitmap", async () => {
  const result = await encodeImage(new File(["image"], "photo.png", { type: "image/png" }));
  expect(result).toMatchObject({ width: 1600, height: 800, mimeType: "image/webp" });
  expect(result.dataUrl).toMatch(/^data:image\/webp;base64,/);
  expect(context.drawImage).toHaveBeenCalledWith(bitmap, 0, 0, 1600, 800);
  expect(bitmap.close).toHaveBeenCalledOnce();
});

it("uses JPEG with an opaque backing when the browser cannot encode WebP", async () => {
  vi.mocked(HTMLCanvasElement.prototype.toBlob).mockImplementation(function (callback, type) {
    callback(new Blob(["encoded"], { type: type === "image/webp" ? "image/png" : type }));
  });
  const result = await encodeImage(new File(["image"], "photo.png", { type: "image/png" }));
  expect(result.mimeType).toBe("image/jpeg");
  expect(context.fillRect).toHaveBeenCalledWith(0, 0, 1600, 800);
});

it("reduces encoding quality to meet the byte budget", async () => {
  let attempts = 0;
  vi.mocked(HTMLCanvasElement.prototype.toBlob).mockImplementation(function (callback, type) {
    callback(new Blob([new Uint8Array(attempts++ === 0 ? 101 : 50)], { type }));
  });
  const result = await encodeImage(new File(["image"], "photo.jpg", { type: "image/jpeg" }), {
    maxBytes: 100,
  });
  expect(imageDataUrlToBlob(result.dataUrl).size).toBe(50);
  expect(HTMLCanvasElement.prototype.toBlob).toHaveBeenCalledTimes(2);
});

it("does not upscale smaller originals", async () => {
  vi.mocked(createImageBitmap).mockResolvedValue({
    ...bitmap,
    width: 320,
    height: 180,
  } as unknown as ImageBitmap);
  const result = await encodeImage(new File(["image"], "photo.jpg", { type: "image/jpeg" }));
  expect(result).toMatchObject({ width: 320, height: 180 });
});

it("rejects unsupported/oversized inputs and unsafe raster payloads", async () => {
  await expect(encodeImage(new File(["text"], "file.txt", { type: "text/plain" }))).rejects.toThrow(
    "Pick an image",
  );
  await expect(
    encodeImage(new File([new Uint8Array(8_000_001)], "large.png", { type: "image/png" })),
  ).rejects.toThrow("under 8MB");
  expect(() => imageDataUrlToBlob("data:text/html;base64,AQID")).toThrow();
  expect(() => imageDataUrlToBlob("data:image/svg+xml;base64,AQID")).toThrow();
});

it("decodes HEIC before applying the normal WebP compression pipeline", async () => {
  const converted = new Blob(["decoded pixels"], { type: "image/png" });
  vi.mocked(heicTo).mockResolvedValueOnce(converted);
  const file = new File(["heic"], "photo.heic", { type: "image/heic" });
  const result = await encodeImage(file);
  expect(heicTo).toHaveBeenCalledWith({ blob: file, type: "image/png" });
  expect(createImageBitmap).toHaveBeenCalledWith(converted);
  expect(result.mimeType).toBe("image/webp");
});

it("releases decoded memory even when canvas creation fails", async () => {
  vi.mocked(HTMLCanvasElement.prototype.getContext).mockReturnValue(null);
  await expect(
    encodeImage(new File(["image"], "photo.jpg", { type: "image/jpeg" })),
  ).rejects.toThrow("Could not process");
  expect(bitmap.close).toHaveBeenCalledOnce();
});
