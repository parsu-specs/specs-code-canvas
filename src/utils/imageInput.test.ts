// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { heicTo } from "heic-to/csp";
import { prepareImageInput } from "./imageInput";

vi.mock("heic-to/csp", () => ({ heicTo: vi.fn() }));
afterEach(() => vi.resetAllMocks());

it.each(["jpeg", "png", "webp", "gif", "bmp", "avif", "svg+xml", "x-icon"])(
  "passes image/%s through to native decoding without loading the HEIC converter",
  (type) => {
    const file = new File(["image"], "photo", { type: `image/${type}` });
    expect(prepareImageInput(file)).toBe(file);
    expect(heicTo).not.toHaveBeenCalled();
  },
);

it.each([
  ["image/heic", "photo.heic"],
  ["image/heif", "photo.heif"],
  ["image/heic-sequence", "photo.heics"],
  ["", "PHOTO.HEIF"],
  ["application/octet-stream", "photo.heic"],
])("converts HEIC/HEIF selected as %s (%s)", async (type, name) => {
  const decoded = new Blob(["pixels"], { type: "image/png" });
  vi.mocked(heicTo).mockResolvedValueOnce(decoded);
  const file = new File(["image"], name, { type });
  expect(await prepareImageInput(file)).toBe(decoded);
  expect(heicTo).toHaveBeenCalledWith({ blob: file, type: "image/png" });
});

it("accepts a known extension with generic or missing MIME metadata", () => {
  for (const type of ["", "application/octet-stream"]) {
    const file = new File(["image"], "photo.avif", { type });
    expect(prepareImageInput(file)).toBe(file);
  }
});

it("validates size and non-image input before starting conversion", () => {
  expect(() =>
    prepareImageInput(new File([new Uint8Array(8_000_001)], "photo.heic", { type: "image/heic" })),
  ).toThrow("under 8MB");
  expect(() => prepareImageInput(new File(["text"], "file.txt", { type: "text/plain" }))).toThrow(
    "Pick an image",
  );
  expect(heicTo).not.toHaveBeenCalled();
});

it("reports unreadable HEIC files clearly", async () => {
  vi.mocked(heicTo).mockRejectedValueOnce(new Error("bad file"));
  await expect(
    prepareImageInput(new File(["invalid"], "photo.heic", { type: "image/heic" })),
  ).rejects.toThrow("Could not decode this HEIC/HEIF image");
});
