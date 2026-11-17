import { installState } from "./pwa";
import { notifyPwaThemeUpdate } from "./pwaThemeUpdate";
import { subscribeAppearance } from "./appearance";
import { SITE_PALETTE_IDS } from "../data/types";

export function readPwaColors() {
  const styles = getComputedStyle(document.documentElement);
  const read = (name: string) => styles.getPropertyValue(`--color-${name}`).trim();
  return {
    primary: read("primary"),
    surface: read("brand-surface"),
    ink: read("brand-foreground"),
    accent: read("brand-accent"),
    background: read("background"),
  };
}

export function applyWindowColor(colors: ReturnType<typeof readPwaColors>) {
  document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]').forEach((meta) => {
    meta.content = colors.primary;
  });
}

/** Public, network-accessible artwork is available to installers without a service worker. */
export function initializePwaBranding() {
  let lastTheme = "";
  const sync = () => {
    applyWindowColor(readPwaColors());
    const root = document.documentElement;
    const palette = SITE_PALETTE_IDS.find((id) => id === root.dataset.palette) ?? "candy";
    const theme = `${palette}-${root.dataset.mode === "dark" ? "dark" : "light"}`;
    if (theme === lastTheme) return;
    const changed = lastTheme !== "";
    lastTheme = theme;
    document.cookie = `cc_pwa_theme=${theme}; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
    const base = `/pwa/themes/${theme}`;
    const appleIcon = document.querySelector<HTMLLinkElement>('link[rel="apple-touch-icon"]');
    if (appleIcon) appleIcon.href = `${base}/icon-180.png?v=3`;
    document
      .querySelectorAll<HTMLLinkElement>('link[rel="apple-touch-startup-image"]')
      .forEach((link) => {
        const filename = link.getAttribute("href")?.match(/splash-\d+-\d+\.png/)?.[0];
        if (filename) link.href = `${base}/${filename}?v=3`;
      });
    const manifest = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
    if (manifest) {
      manifest.crossOrigin = "use-credentials";
      // A different href triggers manifest processing; reinserting an identical link may not.
      // Keep the endpoint and app id stable, and make background fetches cookie-independent.
      manifest.href = `/manifest.webmanifest?theme=${theme}`;
    }
    if (changed && installState() === "installed") notifyPwaThemeUpdate(theme);
  };
  sync();
  const unsubscribe = subscribeAppearance(sync);
  if ("serviceWorker" in navigator) {
    const onControllerChange = () => {
      // The previous worker may have returned its old locally cached manifest.
      const manifest = document.querySelector('link[rel="manifest"]');
      if (manifest) manifest.replaceWith(manifest.cloneNode(true));
    };
    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);
    return () => {
      unsubscribe();
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
    };
  }
  return unsubscribe;
}
