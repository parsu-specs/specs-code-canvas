const STORAGE_KEY = "cc.pwa-theme-update.v1";
const CHANGE_EVENT = "cc:pwa-theme-update";
export type PwaThemeUpdate = { theme: string; createdAt: string; read: boolean };
let snapshot: PwaThemeUpdate | null | undefined;

export function pwaThemeUpdateSnapshot(): PwaThemeUpdate | null {
  if (snapshot !== undefined) return snapshot;
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null");
    snapshot =
      saved &&
      typeof saved.theme === "string" &&
      typeof saved.createdAt === "string" &&
      !Number.isNaN(Date.parse(saved.createdAt)) &&
      typeof saved.read === "boolean"
        ? saved
        : null;
  } catch {
    snapshot = null;
  }
  return snapshot ?? null;
}

function save(update: PwaThemeUpdate | null) {
  snapshot = update;
  try {
    if (update) localStorage.setItem(STORAGE_KEY, JSON.stringify(update));
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* Keep updates available for this session when storage is unavailable. */
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function notifyPwaThemeUpdate(theme: string) {
  save({ theme, createdAt: new Date().toISOString(), read: false });
}
export function markPwaThemeUpdateRead() {
  const current = pwaThemeUpdateSnapshot();
  if (current && !current.read) save({ ...current, read: true });
}
export function dismissPwaThemeUpdate() {
  save(null);
}
export function subscribePwaThemeUpdate(listener: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY || event.key === null) {
      snapshot = undefined;
      listener();
    }
  };
  window.addEventListener(CHANGE_EVENT, listener);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(CHANGE_EVENT, listener);
    window.removeEventListener("storage", onStorage);
  };
}
