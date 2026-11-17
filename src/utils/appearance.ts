import { darkPaletteFor } from "./darkPalettes";
import { activeViewerId, viewerSettingKey } from "./viewerCache";
import type { Appearance } from "../data/types";

export type { Appearance } from "../data/types";

const STORAGE_KEY = "cc.appearance.v1";
const CHANGE_EVENT = "cc:appearance-change";
const sessionAppearances = new Map<string, Appearance>();

export function loadAppearance(): Appearance {
  try {
    const stored = localStorage.getItem(viewerSettingKey(STORAGE_KEY));
    if (stored === "light" || stored === "dark" || stored === "system") return stored;
    // Preserve the appearance of existing Midnight users until they choose a mode.
    if (activeViewerId() && localStorage.getItem(viewerSettingKey("cc.palette.v1")) === "midnight")
      return "dark";
  } catch {
    // Storage can be unavailable in private browsing.
    return sessionAppearances.get(viewerSettingKey(STORAGE_KEY)) ?? "system";
  }
  return "system";
}

export function resolveAppearance(appearance: Appearance, systemDark: boolean): "light" | "dark" {
  return appearance === "system" ? (systemDark ? "dark" : "light") : appearance;
}

export function applyAppearance(appearance = loadAppearance()): void {
  if (typeof document === "undefined") return;
  const systemDark = window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
  document.documentElement.dataset.mode = resolveAppearance(appearance, systemDark);
  const root = document.documentElement;
  const palette = darkPaletteFor(root.dataset.palette ?? "candy");
  for (const [role, value] of Object.entries(palette.colors)) {
    if (root.dataset.mode === "dark") root.style.setProperty(`--color-${role}`, value);
    else root.style.removeProperty(`--color-${role}`);
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function setAppearance(appearance: Appearance): void {
  sessionAppearances.set(viewerSettingKey(STORAGE_KEY), appearance);
  try {
    localStorage.setItem(viewerSettingKey(STORAGE_KEY), appearance);
  } catch {
    // The selection still applies for the current page.
  }
  applyAppearance(appearance);
}

export function appearanceSnapshot(): string {
  return `${loadAppearance()}:${document.documentElement.dataset.mode}`;
}

export function subscribeAppearance(onChange: () => void): () => void {
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => window.removeEventListener(CHANGE_EVENT, onChange);
}

export function initializeAppearance(): void {
  applyAppearance();
  window.matchMedia?.("(prefers-color-scheme: dark)").addEventListener("change", () => {
    if (loadAppearance() === "system") applyAppearance();
  });
  window.addEventListener("storage", (event) => {
    if (event.key === viewerSettingKey(STORAGE_KEY) || event.key === null) {
      applyAppearance();
    }
  });
}
