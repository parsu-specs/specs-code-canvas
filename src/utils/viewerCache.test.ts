import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  activeViewerId,
  cacheHasPassword,
  cacheProfile,
  loadCachedHasPassword,
  loadCachedProfile,
  setActiveViewer,
  viewerSettingKey,
} from "./viewerCache";
import { initializePalette, loadPalette, setPalette } from "./palette";
import { loadAppearance, setAppearance } from "./appearance";
import type { Profile } from "../data/types";

let store: Map<string, string>;
let root: {
  dataset: Record<string, string>;
  setAttribute: (key: string, value: string) => void;
  removeAttribute: (key: string) => void;
  style: { setProperty: ReturnType<typeof vi.fn>; removeProperty: ReturnType<typeof vi.fn> };
};
const profile: Profile = {
  id: "alice",
  name: "Alice",
  role: "Developer",
  bio: "Builds apps",
  color: "sky",
  imageUrl: "https://example.com/avatar.png",
  palette: "ocean",
  appearance: "dark",
  createdAt: "2026-01-01",
};

beforeEach(() => {
  store = new Map();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => store.set(key, value),
    removeItem: (key: string) => store.delete(key),
  });
  root = {
    dataset: {},
    setAttribute: (_key, value) => {
      root.dataset.palette = value;
    },
    removeAttribute: () => {
      delete root.dataset.palette;
    },
    style: { setProperty: vi.fn(), removeProperty: vi.fn() },
  };
  vi.stubGlobal("document", { documentElement: root });
  vi.stubGlobal("window", { matchMedia: () => ({ matches: false }), dispatchEvent: vi.fn() });
});
afterEach(() => vi.unstubAllGlobals());

it("restores account colors and dark mode before any route or profile fetch", () => {
  setActiveViewer("alice");
  cacheProfile(profile);
  setPalette("ocean");
  setAppearance("dark");
  root.dataset = {};
  initializePalette();
  expect(root.dataset.palette).toBe("ocean");
  expect(root.dataset.mode).toBe("dark");
  expect(root.style.setProperty).toHaveBeenCalledWith("--color-background", "#0c151c");
  expect(loadCachedProfile("alice")).toEqual(profile);
});

it("isolates account data and settings, and keeps a visitor default palette with dark mode", () => {
  setActiveViewer("alice");
  cacheProfile(profile);
  cacheHasPassword("alice", true);
  setPalette("ocean");
  setAppearance("light");
  setActiveViewer("bob");
  expect(loadCachedProfile("bob")).toBe(null);
  expect(loadCachedHasPassword("bob")).toBe(null);
  expect(loadPalette()).toBe("candy");
  setActiveViewer(null);
  setAppearance("dark");
  initializePalette();
  expect(root.dataset.palette).toBeUndefined();
  expect(root.dataset.mode).toBe("dark");
  setActiveViewer("alice");
  expect(loadPalette()).toBe("ocean");
  expect(loadAppearance()).toBe("light");
  expect(loadCachedHasPassword("alice")).toBe(true);
});

it("migrates legacy preferences only to the first verified account", () => {
  store.set("cc.palette.v1", "forest");
  store.set("cc.appearance.v1", "dark");
  expect(loadPalette()).toBe("candy");
  setActiveViewer("alice");
  expect(loadPalette()).toBe("forest");
  expect(loadAppearance()).toBe("dark");
  setActiveViewer("bob");
  expect(loadPalette()).toBe("candy");
  expect(loadAppearance()).toBe("system");
});

it("caches only public profile fields and rejects malformed or mismatched data", () => {
  cacheProfile({ ...profile, accessToken: "must-not-be-cached" } as Profile);
  expect([...store.values()].join()).not.toContain("must-not-be-cached");
  const key = [...store.keys()].find((key) => key.includes("profile-cache"))!;
  store.set(key, "invalid json");
  expect(loadCachedProfile("alice")).toBe(null);
  store.set(key, JSON.stringify({ ...profile, id: "bob" }));
  expect(loadCachedProfile("alice")).toBe(null);
  store.set(key, JSON.stringify({ ...profile, name: 123 }));
  expect(loadCachedProfile("alice")).toBe(null);
});

it("handles unavailable storage without breaking session presentation", () => {
  vi.stubGlobal("localStorage", {
    getItem: () => {
      throw new Error("Unavailable");
    },
    setItem: () => {
      throw new Error("Unavailable");
    },
    removeItem: () => {
      throw new Error("Unavailable");
    },
  });
  setActiveViewer("alice");
  expect(activeViewerId()).toBe("alice");
  expect(() => cacheProfile(profile)).not.toThrow();
  expect(loadCachedProfile("alice")).toBe(null);
  setActiveViewer(null);
  expect(viewerSettingKey("setting")).toContain("visitor");
});
