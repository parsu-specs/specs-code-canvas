import { normalizePathname } from "../pages/routes";

const KEY = "cc.shared-destination.v1";
let fallback: string | null = null;

function isSharedPath(path: string) {
  return /^\/(apps|developers)\/[^/?#\\]+$/.test(path);
}

/** Keep shared project/profile links through password and OAuth sign-in. */
export function rememberSharedDestination(pathname: string) {
  const path = normalizePathname(pathname);
  if (!isSharedPath(path)) return;
  fallback = path;
  try {
    sessionStorage.setItem(KEY, path);
  } catch {
    /* Storage can be disabled. */
  }
}

export function consumeSharedDestination(): string | null {
  let path = fallback;
  fallback = null;
  try {
    path = sessionStorage.getItem(KEY) ?? path;
    sessionStorage.removeItem(KEY);
  } catch {
    /* The in-memory fallback still supports password sign-in. */
  }
  return path && isSharedPath(path) ? path : null;
}
