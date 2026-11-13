// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { cropGeometry, exportImageCrop, initialImageEdits } from "./imageEditor";

afterEach(() => vi.restoreAllMocks());

it("centers a landscape image inside a square crop and clamps panning to the edges", () => {
  expect(cropGeometry(1200, 600, 300, 300, initialImageEdits)).toEqual({
    scale: 0.5,
    rangeX: 150,
    rangeY: 0,
    centerX: 150,
    centerY: 150,
  });
  expect(cropGeometry(1200, 600, 300, 300, { ...initialImageEdits, x: 5, y: -5 })).toMatchObject({
    centerX: 300,
    centerY: 150,
  });
});

it("uses rotated dimensions and adds panning room when zoomed", () => {
  expect(cropGeometry(1200, 600, 300, 300, { ...initialImageEdits, rotation: 90 })).toMatchObject({
    rangeX: 0,
    rangeY: 150,
  });
  expect(
    cropGeometry(600, 600, 300, 300, { ...initialImageEdits, zoom: 2, x: -1, y: 1 }),
  ).toMatchObject({
    scale: 1,
    centerX: 0,
    centerY: 300,
  });
});

function mockCanvas(width: number, height: number) {
  const image = new Image();
  Object.defineProperties(image, {
    naturalWidth: { value: width },
    naturalHeight: { value: height },
  });
  const context = {
    clearRect: vi.fn(),
    save: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
    drawImage: vi.fn(),
    restore: vi.fn(),
  };
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(
    context as unknown as CanvasRenderingContext2D,
  );
  const toBlob = vi
    .spyOn(HTMLCanvasElement.prototype, "toBlob")
    .mockImplementation(function (callback, type) {
      callback(new Blob(["image"], { type }));
    });
  return { image, context, toBlob };
}

it("exports a rotated PNG File and caps its longest edge", async () => {
  const { image, context, toBlob } = mockCanvas(4000, 2000);
  const file = await exportImageCrop(
    image,
    "photo.jpg",
    { ...initialImageEdits, rotation: 90 },
    16 / 9,
  );
  expect(file.name).toBe("photo-edited.png");
  expect(file.type).toBe("image/png");
  const canvas = toBlob.mock.instances[0] as HTMLCanvasElement;
  expect([canvas.width, canvas.height]).toEqual([1600, 900]);
  expect(context.rotate).toHaveBeenCalledWith(Math.PI / 2);
});

it("does not upscale a small crop after zooming", async () => {
  const { image, toBlob } = mockCanvas(320, 240);
  await exportImageCrop(image, "photo.png", { ...initialImageEdits, zoom: 2 }, 1);
  const canvas = toBlob.mock.instances[0] as HTMLCanvasElement;
  expect([canvas.width, canvas.height]).toEqual([120, 120]);
});

it("reports canvas encoding failures", async () => {
  const { image, toBlob } = mockCanvas(320, 240);
  toBlob.mockImplementation((callback) => callback(null));
  await expect(exportImageCrop(image, "photo.png", initialImageEdits, 1)).rejects.toThrow(
    "Could not save",
  );
});
