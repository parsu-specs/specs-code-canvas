export type EncodedImage = { dataUrl: string; width: number; height: number; mimeType: string };

function blobDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not process that image."));
    reader.readAsDataURL(blob);
  });
}

export function imageDataUrlToBlob(src: string): Blob {
  const match = /^data:(image\/(?:webp|jpeg|png));base64,([A-Za-z0-9+/=]+)$/.exec(src);
  if (!match || src.length > 500_000) throw new Error("Could not read that image.");
  let bytes: Uint8Array;
  try {
    bytes = Uint8Array.from(atob(match[2]), (char) => char.charCodeAt(0));
  } catch {
    throw new Error("Could not read that image.");
  }
  return new Blob([bytes.buffer as ArrayBuffer], { type: match[1] });
}

export async function imageDimensions(src: string) {
  const image = new Image();
  image.src = src;
  await image.decode();
  if (!image.naturalWidth || !image.naturalHeight) throw new Error("Could not read that image.");
  return { width: image.naturalWidth, height: image.naturalHeight };
}

export async function encodeImage(
  file: File,
  {
    maxDimension = 1600,
    maxWidth = Infinity,
    maxHeight = Infinity,
    quality = 0.82,
    maxBytes = 300_000,
  } = {},
): Promise<EncodedImage> {
  const kind = (file.type || "").toLowerCase();
  if (kind.includes("heic") || kind.includes("heif")) {
    throw new Error("iPhone HEIC photos can't be read here yet. Convert to JPEG/PNG first.");
  }
  // Some gallery/camera apps report an empty MIME type for valid photos,
  // so only reject when a type IS present and is definitely not an image.
  if (kind && !kind.startsWith("image/")) {
    throw new Error("Pick an image file from your gallery.");
  }
  if (file.size > 8_000_000) throw new Error("That file is too big. Pick one under 8MB.");

  const fallback = async () => {
    // Fallback for browsers without createImageBitmap file support.
    const url = URL.createObjectURL(file);
    try {
      const img = new Image();
      img.decoding = "async";
      img.src = url;
      await img.decode();
      return img;
    } finally {
      URL.revokeObjectURL(url);
    }
  };
  let bitmap: ImageBitmap | HTMLImageElement;
  try {
    bitmap =
      typeof createImageBitmap === "function" ? await createImageBitmap(file) : await fallback();
  } catch {
    bitmap = await fallback();
  }

  const width = bitmap.width || (bitmap as HTMLImageElement).width;
  const height = bitmap.height || (bitmap as HTMLImageElement).height;
  try {
    if (!width || !height) throw new Error("Could not read that image.");
    let dimension =
      Math.max(width, height) *
      Math.min(1, maxDimension / Math.max(width, height), maxWidth / width, maxHeight / height);
    let currentQuality = quality;
    for (let attempt = 0; attempt < 12; attempt++) {
      const scale = Math.min(1, dimension / Math.max(width, height));
      const w = Math.max(1, Math.round(width * scale));
      const h = Math.max(1, Math.round(height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Could not process that image.");
      ctx.drawImage(bitmap, 0, 0, w, h);
      const encode = (type: string) =>
        new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, currentQuality));
      let blob = await encode("image/webp");
      if (blob?.type !== "image/webp") {
        // JPEG fallback needs an opaque backing for transparent PNG uploads.
        ctx.globalCompositeOperation = "destination-over";
        ctx.fillStyle = "#fff";
        ctx.fillRect(0, 0, w, h);
        blob = await encode("image/jpeg");
      }
      if (!blob) throw new Error("Could not process that image.");
      if (blob.size <= maxBytes)
        return { dataUrl: await blobDataUrl(blob), width: w, height: h, mimeType: blob.type };
      if (currentQuality > 0.69) currentQuality = Math.max(0.68, currentQuality - 0.07);
      else {
        dimension = Math.max(1, Math.round(dimension * 0.8));
        currentQuality = quality;
      }
    }
    throw new Error("Images are too large. Pick smaller files.");
  } finally {
    if ("close" in bitmap) bitmap.close();
  }
}

export async function fileToThumbnailDataUrl(file: File, maxDim = 768): Promise<string> {
  return (
    await encodeImage(file, {
      maxDimension: maxDim,
      quality: 0.76,
      maxBytes: maxDim <= 256 ? 30_000 : 80_000,
    })
  ).dataUrl;
}

export async function fileToProjectImageDataUrl(file: File): Promise<string> {
  return (await encodeImage(file, { maxDimension: 3200, maxWidth: 1600, maxHeight: 3200 })).dataUrl;
}
