import { isSafeImageUrl } from "./urls";

export const PROJECT_IMAGE_BUCKET = "project-images";
export const PROJECT_COVER_SIZES =
  "(min-width: 1536px) 1152px, (min-width: 1024px) calc(100vw - 360px), (min-width: 640px) calc(100vw - 64px), calc(100vw - 32px)";

/** Account for the pixels cropped by object-fit: cover in a tall mobile frame. */
export function projectCoverSizes(width?: number, height?: number) {
  if (!width || !height) return PROJECT_COVER_SIZES;
  const mobile = Math.ceil((320 * width) / height);
  const desktop = Math.ceil((384 * width) / height);
  return `(min-width: 1536px) max(1152px, ${desktop}px), (min-width: 1024px) max(calc(100vw - 360px), ${desktop}px), (min-width: 768px) max(calc(100vw - 64px), ${desktop}px), (min-width: 640px) max(calc(100vw - 64px), ${mobile}px), max(calc(100vw - 32px), ${mobile}px)`;
}

export function projectImageSources(src: string, storageUrl = import.meta.env.VITE_SUPABASE_URL) {
  if (!isSafeImageUrl(src)) return null;
  const legacy = {
    cover: src,
    thumbnail: src,
    width: undefined as number | undefined,
    height: undefined as number | undefined,
    thumbnailWidth: undefined as number | undefined,
    thumbnailHeight: undefined as number | undefined,
    srcSet: undefined as string | undefined,
    storagePath: undefined as string | undefined,
    ownerId: undefined as string | undefined,
  };
  if (!storageUrl || !src.startsWith("http")) return legacy;
  try {
    const url = new URL(src);
    if (url.origin !== new URL(storageUrl).origin) return legacy;
    const match =
      /^\/storage\/v1\/object\/public\/project-images\/([\w-]+)\/v1\/([\w-]+)\/cover$/.exec(
        url.pathname,
      );
    if (!match) return legacy;
    const metadata = new URLSearchParams(url.hash.slice(1));
    const dimension = (key: string) => {
      const value = Number(metadata.get(key));
      return Number.isInteger(value) && value > 0 && value <= 16_000 ? value : undefined;
    };
    const width = dimension("w"),
      height = dimension("h"),
      thumbnailWidth = dimension("tw"),
      thumbnailHeight = dimension("th");
    url.hash = "";
    url.search = "";
    const cover = url.href;
    url.pathname = url.pathname.replace(/\/cover$/, "/thumbnail");
    const thumbnail = url.href;
    const srcSet =
      width && thumbnailWidth && width > thumbnailWidth
        ? `${thumbnail} ${thumbnailWidth}w, ${cover} ${width}w`
        : undefined;
    return {
      cover,
      thumbnail,
      width,
      height,
      thumbnailWidth,
      thumbnailHeight,
      srcSet,
      storagePath: `${match[1]}/v1/${match[2]}/cover`,
      ownerId: match[1],
    };
  } catch {
    return legacy;
  }
}
