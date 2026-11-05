// Shared URL allowlists: the single source of truth for "may this string
// become a link href or an <img> src". Render paths must use these —
// write-path validation alone cannot protect rows written before a rule
// existed, or rows written around the API (Supabase console, direct
// PostgREST). See Markdown.tsx (same policy for markdown links).

/** Strict http(s) links only. Use before rendering any href. */
export function isSafeHttpUrl(value: string | null | undefined): boolean {
  if (!value) return false;
  const clean = value.trim();
  if (!/^(https?:\/\/)/i.test(clean)) return false;
  try {
    const url = new URL(clean);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

/** Images may additionally be inline image data URLs; new uploads are rasterized. */
export function isSafeImageUrl(value: string | null | undefined): boolean {
  if (!value) return false;
  const clean = value.trim();
  if (clean.startsWith("data:image/")) return clean.length <= 500_000;
  return isSafeHttpUrl(clean);
}
