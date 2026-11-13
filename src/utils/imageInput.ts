export const IMAGE_FILE_ACCEPT = "image/*,.heic,.heif,.heics,.heifs,.avif,.bmp,.gif,.svg";

/** Validate the original, and load the HEIC decoder only for iPhone image formats. */
export function prepareImageInput(file: File): Blob | Promise<Blob> {
  const kind = file.type.toLowerCase();
  const knownExtension =
    /\.(?:jpe?g|jfif|png|webp|gif|bmp|avif|svg|ico|heic|heif|heics|heifs)$/i.test(file.name);
  if (
    kind &&
    !kind.startsWith("image/") &&
    !(kind === "application/octet-stream" && knownExtension)
  ) {
    throw new Error("Pick an image file from your gallery.");
  }
  if (file.size > 8_000_000) throw new Error("That file is too big. Pick one under 8MB.");
  if (/^image\/hei[cf](?:-sequence)?$/.test(kind) || /\.hei[cf]s?$/i.test(file.name)) {
    return convertHeic(file);
  }
  // Let the browser decode all other supported formats, including animated inputs.
  return file;
}

async function convertHeic(file: File): Promise<Blob> {
  try {
    const { heicTo } = await import("heic-to/csp");
    return await heicTo({ blob: file, type: "image/png" });
  } catch {
    throw new Error("Could not decode this HEIC/HEIF image. Try exporting it as JPEG or PNG.");
  }
}
