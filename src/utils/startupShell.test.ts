// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { nativeSplashScript } from "../../build/nativeSplash";

afterEach(() => {
  vi.unstubAllGlobals();
  delete document.documentElement.dataset.nativeSplash;
  localStorage.clear();
});

function runStartup() {
  window.eval(nativeSplashScript);
}

it.each([
  ["Android", "standalone", true],
  ["Android", "fullscreen", true],
  ["Android", "minimal-ui", true],
  ["Android", "browser", false],
  ["iPhone", "standalone", false],
  ["Windows", "standalone", false],
])("handles the native launch screen for %s in %s", (userAgent, mode, native) => {
  vi.stubGlobal("navigator", { userAgent });
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: query === `(display-mode: ${mode})`,
  }));
  runStartup();
  expect(document.documentElement.hasAttribute("data-native-splash")).toBe(native);
});

it("detects the native splash even when storage is unavailable", () => {
  vi.stubGlobal("navigator", { userAgent: "Android" });
  vi.stubGlobal("matchMedia", () => ({ matches: true }));
  vi.stubGlobal("localStorage", {
    getItem() {
      throw new Error("Storage blocked");
    },
  });
  runStartup();
  expect(document.documentElement.dataset.nativeSplash).toBe("true");
});
