import { getSupabase } from "./client";
import { encodeImage, imageDataUrlToBlob, imageDimensions } from "../../utils/images";
import { PROJECT_IMAGE_BUCKET, projectImageSources } from "../../utils/projectImages";
import { isSafeImageUrl } from "../../utils/urls";

const uploadError = "Could not upload images. Please try again.";
const missingBucket = (error: unknown) =>
  /bucket.*(?:not found|does not exist)/i.test(String((error as { message?: string })?.message));

/** Keep writes atomic from the application's perspective, including partial uploads. */
export async function withStoredProjectImages<T>(
  sources: string[],
  ownerId: string,
  save: (images: string[]) => Promise<T>,
): Promise<T> {
  if (!sources.length || !sources.some((src) => src.startsWith("data:"))) return save(sources);
  if (!/^[\w-]+$/.test(ownerId)) throw new Error("You are not signed in.");
  const bucket = getSupabase().storage.from(PROJECT_IMAGE_BUCKET);
  const uploaded: string[] = [];
  const rollback = async () => {
    if (uploaded.length) await bucket.remove(uploaded).catch(() => undefined);
  };
  const upload = async (src: string) => {
    if (!isSafeImageUrl(src)) throw new Error("Could not read that image.");
    if (!src.startsWith("data:")) return src;
    const cover = imageDataUrlToBlob(src);
    const dimensions = await imageDimensions(src);
    const thumbnail = await encodeImage(new File([cover], "screenshot", { type: cover.type }), {
      maxDimension: 1536,
      maxWidth: 768,
      maxHeight: 1536,
      quality: 0.76,
      maxBytes: 80_000,
    });
    const id =
      globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const directory = `${ownerId}/v1/${id}`;
    const files = [
      [`${directory}/cover`, cover],
      [`${directory}/thumbnail`, imageDataUrlToBlob(thumbnail.dataUrl)],
    ] as const;
    const writes = await Promise.allSettled(
      files.map(async ([path, blob]) => {
        const { error } = await bucket.upload(path, blob, {
          contentType: blob.type,
          cacheControl: "31536000",
          upsert: false,
        });
        if (error) throw error;
        uploaded.push(path);
      }),
    );
    const failed = writes.find((write) => write.status === "rejected");
    if (failed?.status === "rejected") throw failed.reason;
    const { data } = bucket.getPublicUrl(`${directory}/cover`);
    const metadata = new URLSearchParams({
      w: String(dimensions.width),
      h: String(dimensions.height),
      tw: String(thumbnail.width),
      th: String(thumbnail.height),
    });
    return `${data.publicUrl}#${metadata}`;
  };
  const results: PromiseSettledResult<string>[] = [];
  for (const src of sources) {
    try {
      results.push({ status: "fulfilled", value: await upload(src) });
    } catch (reason) {
      results.push({ status: "rejected", reason });
      break;
    }
  }
  const failed = results.filter((result) => result.status === "rejected");
  if (failed.length) {
    await rollback();
    if (failed.every((result) => result.status === "rejected" && missingBucket(result.reason))) {
      // Older deployments can still publish while the bucket migration is pending.
      const compact: string[] = [];
      for (const src of sources) {
        if (!src.startsWith("data:")) {
          compact.push(src);
          continue;
        }
        const blob = imageDataUrlToBlob(src);
        compact.push(
          (
            await encodeImage(new File([blob], "screenshot", { type: blob.type }), {
              maxDimension: 800,
              quality: 0.76,
              maxBytes: 80_000,
            })
          ).dataUrl,
        );
      }
      return save(compact);
    }
    throw new Error(uploadError);
  }
  const images = results.map((result) => (result as PromiseFulfilledResult<string>).value);
  try {
    return await save(images);
  } catch (error) {
    await rollback();
    throw error;
  }
}

/** Never remove another owner's files, an external URL, or a still-referenced asset. */
export async function cleanupProjectImages(previous: string[], next: string[], ownerId: string) {
  const supabase = getSupabase();
  const retained = new Set(
    next.map((src) => projectImageSources(src)?.storagePath).filter(Boolean),
  );
  const paths = new Set<string>();
  for (const src of new Set(previous)) {
    const image = projectImageSources(src);
    if (!image?.storagePath || image.ownerId !== ownerId || retained.has(image.storagePath))
      continue;
    const { data, error } = await supabase.rpc("project_image_is_referenced", {
      p_cover_url: image.cover,
    });
    if (error || data !== false) continue;
    paths.add(image.storagePath);
    paths.add(image.storagePath.replace(/\/cover$/, "/thumbnail"));
  }
  if (paths.size) await supabase.storage.from(PROJECT_IMAGE_BUCKET).remove([...paths]);
}
