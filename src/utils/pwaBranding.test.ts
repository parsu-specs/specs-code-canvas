// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { applyWindowColor, readPwaColors, initializePwaBranding } from "./pwaBranding";

afterEach(() => {
  vi.unstubAllGlobals();
  document.head.innerHTML = "";
  delete document.documentElement.dataset.palette;
  delete document.documentElement.dataset.mode;
  document.cookie = "cc_pwa_theme=; Path=/; Max-Age=0";
});

it("publishes the device preference and network artwork before requesting a manifest update", () => {
  vi.stubGlobal("getComputedStyle", () => ({ getPropertyValue: () => "#6558bd" }));
  document.head.innerHTML =
    '<link rel="manifest" href="/manifest.webmanifest"><link rel="apple-touch-icon" href="/pwa/icon-180.png"><link rel="apple-touch-startup-image" href="/pwa/splash-1170-2532.png">';
  initializePwaBranding();
  const original = document.querySelector('link[rel="manifest"]');
  expect(document.cookie).toContain("cc_pwa_theme=candy-light");
  document.documentElement.dataset.palette = "forest";
  document.documentElement.dataset.mode = "dark";
  window.dispatchEvent(new Event("cc:appearance-change"));
  expect(document.cookie).toContain("cc_pwa_theme=forest-dark");
  expect(document.querySelector('link[rel="apple-touch-icon"]')?.getAttribute("href")).toBe(
    "/pwa/themes/forest-dark/icon-180.png?v=3",
  );
  expect(
    document.querySelector('link[rel="apple-touch-startup-image"]')?.getAttribute("href"),
  ).toBe("/pwa/themes/forest-dark/splash-1170-2532.png?v=3");
  const updated = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
  expect(updated).not.toBe(original);
  expect(updated?.crossOrigin).toBe("use-credentials");
  expect(updated?.getAttribute("href")).toBe("/manifest.webmanifest");
  window.dispatchEvent(new Event("cc:appearance-change"));
  expect(document.querySelector('link[rel="manifest"]')).toBe(updated);
});

it("uses the resolved primary color for window chrome as palettes change", () => {
  const properties: Record<string, string> = {
    "--color-primary": "#2f6df6",
    "--color-brand-surface": "#2f6df6",
    "--color-brand-foreground": "#ffffff",
    "--color-brand-accent": "#ffcf5c",
    "--color-background": "#f6f4ed",
  };
  vi.stubGlobal("getComputedStyle", () => ({
    getPropertyValue: (name: string) => properties[name] ?? "",
  }));
  document.head.innerHTML = '<meta name="theme-color" content="#6558bd">';
  expect(readPwaColors()).toEqual({
    primary: "#2f6df6",
    surface: "#2f6df6",
    ink: "#ffffff",
    accent: "#ffcf5c",
    background: "#f6f4ed",
  });
  applyWindowColor(readPwaColors());
  expect(document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')?.content).toBe(
    "#2f6df6",
  );
  properties["--color-primary"] = "#c2a5f5";
  applyWindowColor(readPwaColors());
  expect(document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')?.content).toBe(
    "#c2a5f5",
  );
});
