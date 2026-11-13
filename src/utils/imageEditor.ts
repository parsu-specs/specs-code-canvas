export type ImageEdits = {
  zoom: number;
  rotation: 0 | 90 | 180 | 270;
  /** Position within the available crop range, from -1 to 1. */
  x: number;
  y: number;
};

export const initialImageEdits: ImageEdits = { zoom: 1, rotation: 0, x: 0, y: 0 };

export function cropGeometry(
  imageWidth: number,
  imageHeight: number,
  width: number,
  height: number,
  edits: ImageEdits,
) {
  const sideways = edits.rotation === 90 || edits.rotation === 270;
  const rotatedWidth = sideways ? imageHeight : imageWidth;
  const rotatedHeight = sideways ? imageWidth : imageHeight;
  const scale = Math.max(width / rotatedWidth, height / rotatedHeight) * edits.zoom;
  const rangeX = Math.max(0, (rotatedWidth * scale - width) / 2);
  const rangeY = Math.max(0, (rotatedHeight * scale - height) / 2);
  return {
    scale,
    rangeX,
    rangeY,
    centerX: width / 2 + Math.max(-1, Math.min(1, edits.x)) * rangeX,
    centerY: height / 2 + Math.max(-1, Math.min(1, edits.y)) * rangeY,
  };
}

/** Both the preview and export use this renderer so their crops match. */
export function drawImageCrop(
  canvas: HTMLCanvasElement,
  image: HTMLImageElement,
  edits: ImageEdits,
) {
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Your browser could not edit this image.");
  const crop = cropGeometry(
    image.naturalWidth,
    image.naturalHeight,
    canvas.width,
    canvas.height,
    edits,
  );
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.save();
  context.translate(crop.centerX, crop.centerY);
  context.rotate((edits.rotation * Math.PI) / 180);
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(
    image,
    (-image.naturalWidth * crop.scale) / 2,
    (-image.naturalHeight * crop.scale) / 2,
    image.naturalWidth * crop.scale,
    image.naturalHeight * crop.scale,
  );
  context.restore();
}

export async function exportImageCrop(
  image: HTMLImageElement,
  name: string,
  edits: ImageEdits,
  aspectRatio: number,
) {
  const sideways = edits.rotation === 90 || edits.rotation === 270;
  const width = sideways ? image.naturalHeight : image.naturalWidth;
  const height = sideways ? image.naturalWidth : image.naturalHeight;
  // Keep the original resolution, cap the longest edge, and never upscale.
  const outputWidth = Math.min(width, height * aspectRatio) / edits.zoom;
  const scale = Math.min(1, 1600 / Math.max(outputWidth, outputWidth / aspectRatio));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(outputWidth * scale));
  canvas.height = Math.max(1, Math.round((outputWidth * scale) / aspectRatio));
  drawImageCrop(canvas, image, edits);
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((result) => {
      if (result) resolve(result);
      else reject(new Error("Could not save this image. Please try again."));
    }, "image/png");
  });
  return new File([blob], `${name.replace(/\.[^.]+$/, "") || "image"}-edited.png`, {
    type: "image/png",
  });
}
