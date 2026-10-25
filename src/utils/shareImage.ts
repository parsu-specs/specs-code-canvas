export type SharePalette = { primary: string; accent: string; ink: string; onPrimary: string };

export const DEFAULT_SHARE_PALETTE: SharePalette = {
  primary: "#fa4928",
  accent: "#ffbc21",
  ink: "#21143d",
  onPrimary: "#ffffff",
};

function colorChannels(color: string): number[] | null {
  const hex = color.match(/^#([a-f\d]{6}|[a-f\d]{3})$/i)?.[1];
  if (hex) {
    const expanded = hex.length === 3 ? [...hex].map((digit) => digit + digit).join("") : hex;
    return [0, 2, 4].map((start) => parseInt(expanded.slice(start, start + 2), 16));
  }
  const rgb = color.match(/^rgba?\(([^)]+)\)$/i)?.[1];
  if (rgb)
    return rgb
      .split(/[,\s/]+/)
      .slice(0, 3)
      .map(Number);
  const srgb = color.match(/^color\(srgb\s+([^)]+)\)$/i)?.[1];
  return srgb
    ? srgb
        .split(/[\s/]+/)
        .slice(0, 3)
        .map((value) => Number(value) * 255)
    : null;
}

function luminance(color: string): number | null {
  const rgb = colorChannels(color);
  if (!rgb || rgb.some((value) => !Number.isFinite(value))) return null;
  const linear = rgb.map((value) => {
    const channel = Math.min(255, Math.max(0, value)) / 255;
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
}

export function shareColorContrast(foreground: string, background: string): number {
  const first = luminance(foreground);
  const second = luminance(background);
  if (first === null || second === null) return 0;
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
}

function readableTwoToneAccent(primary: string, accent: string, baseText: string): string {
  const source = colorChannels(accent);
  const base = colorChannels(baseText);
  if (!source || !base) return baseText;
  const distinct = (rgb: number[]) =>
    Math.hypot(...rgb.map((value, index) => value - base[index])) >= 24;
  if (distinct(source) && shareColorContrast(accent, primary) >= 4.5) return accent;
  // Adjust the existing accent toward a darker/lighter shade, preserving its hue.
  for (let step = 1; step <= 40; step++) {
    for (const target of [0, 255]) {
      const rgb = source.map((value) => Math.round(value + ((target - value) * step) / 40));
      const candidate = `rgb(${rgb.join(", ")})`;
      if (distinct(rgb) && shareColorContrast(candidate, primary) >= 4.5) return candidate;
    }
  }
  return baseText;
}

/** Resolve text separately for each surface, retaining the accent when it is legible. */
export function shareTextColors(primary: string, accent: string, preserveTwoTone = false) {
  const readable = (background: string) =>
    [DEFAULT_SHARE_PALETTE.ink, "#ffffff", "#000000"].find(
      (color) => shareColorContrast(color, background) >= 4.5,
    ) ?? DEFAULT_SHARE_PALETTE.ink;
  const onPrimary = readable(primary);
  const headerAccent = preserveTwoTone
    ? readableTwoToneAccent(primary, accent, onPrimary)
    : shareColorContrast(accent, primary) >= 4.5
      ? accent
      : onPrimary;
  const lighterAccentFirst =
    preserveTwoTone && (luminance(headerAccent) ?? 0) > (luminance(onPrimary) ?? 0);
  return {
    onPrimary: lighterAccentFirst ? headerAccent : onPrimary,
    headerAccent: lighterAccentFirst ? onPrimary : headerAccent,
    onAccent: readable(accent),
  };
}

/** Correct repeated pastes for the photo without changing the stored project link. */
export function normalizeSharePhotoUrl(value: string | undefined): string | undefined {
  const clean = value?.trim();
  if (!clean || !/^https?:\/\//i.test(clean)) return clean;
  for (const match of clean.matchAll(/https?:\/\//gi)) {
    if (!match.index) continue;
    const candidate = clean.slice(0, match.index).trimEnd();
    let remainder = clean;
    let copies = 0;
    while (remainder.startsWith(candidate)) {
      remainder = remainder.slice(candidate.length).trimStart();
      copies++;
    }
    if (!remainder && copies > 1) return candidate;
  }
  return clean;
}

/** Favor a recurring, colorful thumbnail color over white margins and dark text. */
export function paletteFromPixels(pixels: ArrayLike<number>): SharePalette {
  const buckets = new Map<string, { count: number; rgb: number[]; score: number }>();
  for (let i = 0; i < pixels.length; i += 4) {
    if (pixels[i + 3] < 128) continue;
    const rgb = [pixels[i], pixels[i + 1], pixels[i + 2]];
    const max = Math.max(...rgb);
    const min = Math.min(...rgb);
    if (max < 45 || min > 225) continue;
    const key = rgb.map((value) => Math.round(value / 32)).join(",");
    const bucket = buckets.get(key) ?? { count: 0, rgb, score: 0 };
    bucket.count++;
    bucket.score = bucket.count * (0.25 + (max - min) / 255);
    buckets.set(key, bucket);
  }
  const dominant = [...buckets.values()].sort((a, b) => b.score - a.score)[0];
  if (!dominant) return DEFAULT_SHARE_PALETTE;
  const [r, g, b] = dominant.rgb;
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  const accent =
    [...buckets.values()]
      .filter(({ rgb }) => {
        const brightness = 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
        const distance = Math.hypot(rgb[0] - r, rgb[1] - g, rgb[2] - b);
        return brightness > 120 && Math.max(...rgb) - Math.min(...rgb) > 70 && distance > 100;
      })
      .sort((a, b) => b.score - a.score)[0]?.rgb ??
    dominant.rgb.map((value) => Math.round(value * 0.4 + 255 * 0.6));
  return {
    primary: `rgb(${r}, ${g}, ${b})`,
    accent: `rgb(${accent.join(", ")})`,
    ink: "#21143d",
    onPrimary: luminance > 150 ? "#21143d" : "#ffffff",
  };
}

/** Embed the image before export so a blocked remote image never silently disappears. */
export async function prepareShareImage(url: string) {
  const image = new Image();
  image.crossOrigin = "anonymous";
  await new Promise<void>((resolve, reject) => {
    const timer = window.setTimeout(() => {
      image.onload = image.onerror = null;
      reject(new Error("Image loading timed out."));
    }, 15000);
    image.onload = () => {
      clearTimeout(timer);
      resolve();
    };
    image.onerror = () => {
      clearTimeout(timer);
      reject(new Error("Image could not be loaded for export."));
    };
    image.src = url;
  });
  const canvas = document.createElement("canvas");
  const scale = Math.min(1, 1600 / Math.max(image.naturalWidth, image.naturalHeight));
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Image export is unavailable in this browser.");
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  const dataUrl = canvas.toDataURL("image/png");
  canvas.width = canvas.height = 48;
  context.drawImage(image, 0, 0, 48, 48);
  return { dataUrl, palette: paletteFromPixels(context.getImageData(0, 0, 48, 48).data) };
}

export function shareImageFilename(title: string) {
  return `${
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 80) || "codecanvas"
  }-share.png`;
}
