/** Icons are compact raster data URLs, independent of the screenshot gallery. */
export function isProjectIcon(value: string | null | undefined): value is string {
  return (
    !!value &&
    value.length <= 60_000 &&
    /^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(value)
  );
}

export function validateProjectIcon(value: string | undefined) {
  if (value && !isProjectIcon(value)) throw new Error("Choose a smaller project icon image.");
}
