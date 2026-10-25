import { describe, expect, it } from "vitest";
import {
  DEFAULT_SHARE_PALETTE,
  normalizeSharePhotoUrl,
  paletteFromPixels,
  shareImageFilename,
  shareColorContrast,
  shareTextColors,
} from "./shareImage";

describe("share photo text contrast", () => {
  it.each([
    ["#ffffff", "#ffff00"],
    ["#fa4928", "#ffbc21"],
    ["#233e36", "color(srgb 0.44 0.51 0.48)"],
    ["rgb(190, 235, 210)", "rgb(205, 242, 220)"],
    ["#777777", "#000080"],
    ["#c2a5f5", "#333333"],
    ["#000000", "#ffffff"],
  ])("maintains readable text on %s and %s", (primary, accent) => {
    const colors = shareTextColors(primary, accent);
    expect(shareColorContrast(colors.onPrimary, primary)).toBeGreaterThanOrEqual(4.5);
    expect(shareColorContrast(colors.headerAccent, primary)).toBeGreaterThanOrEqual(4.5);
    expect(shareColorContrast(colors.onAccent, accent)).toBeGreaterThanOrEqual(4.5);
  });
  it("retains the header accent when it already has sufficient contrast", () => {
    expect(shareTextColors("#000000", "#ffcc00").headerAccent).toBe("#ffcc00");
  });
  it.each([
    ["#233e36", "color(srgb 0.44 0.51 0.48)"],
    ["#ffe064", "#ffebb0"],
    ["#c2a5f5", "#dcc8fa"],
    ["#000000", "#ffffff"],
  ])(
    "orders the %s placeholder tones from lighter to darker with readable contrast",
    (primary, accent) => {
      const colors = shareTextColors(primary, accent, true);
      expect(colors.headerAccent).not.toBe(colors.onPrimary);
      expect(shareColorContrast(colors.headerAccent, primary)).toBeGreaterThanOrEqual(4.5);
      expect(shareColorContrast(colors.onPrimary, primary)).toBeGreaterThanOrEqual(4.5);
      expect(shareColorContrast(colors.onPrimary, "#000000")).toBeGreaterThan(
        shareColorContrast(colors.headerAccent, "#000000"),
      );
    },
  );
  it("keeps thumbnail text behavior when placeholder adjustment is disabled", () => {
    const colors = shareTextColors("#233e36", "color(srgb 0.44 0.51 0.48)");
    expect(colors.headerAccent).toBe(colors.onPrimary);
  });
});

describe("share photo URL cleanup", () => {
  const mediafire = "https://www.mediafire.com/file/6bqic78b4l0zlu4/CoffeeLog.apk/file";
  it.each([
    `${mediafire}${mediafire}`,
    `${mediafire} ${mediafire}`,
    `${mediafire}\n${mediafire}`,
    mediafire.repeat(3),
  ])("collapses repeated pastes: %s", (value) => {
    expect(normalizeSharePhotoUrl(value)).toBe(mediafire);
  });
  it.each([
    mediafire,
    "https://example.com/redirect?url=https://example.com/app",
    "https://example.com/app#https://example.com/app",
    "https://example.com/apphttps://other.example/app",
  ])("preserves distinct and nested URL content: %s", (value) => {
    expect(normalizeSharePhotoUrl(value)).toBe(value);
  });
  it("trims surrounding whitespace and handles missing links", () => {
    expect(normalizeSharePhotoUrl(` ${mediafire} `)).toBe(mediafire);
    expect(normalizeSharePhotoUrl(undefined)).toBeUndefined();
    expect(normalizeSharePhotoUrl("")).toBe("");
  });
});

describe("share image palette", () => {
  it("ignores transparent pixels, white margins, and black text", () => {
    const pixels = [255, 255, 255, 255, 0, 0, 0, 255, 0, 255, 0, 0, 240, 70, 30, 255];
    expect(paletteFromPixels(pixels).primary).toBe("rgb(240, 70, 30)");
  });
  it("uses the default palette when no usable colors exist", () => {
    expect(paletteFromPixels([255, 255, 255, 255])).toEqual(DEFAULT_SHARE_PALETTE);
  });
  it("chooses a contrasting accent that is present in the thumbnail", () => {
    const navy = [20, 50, 150, 255];
    const yellow = [250, 220, 40, 255];
    expect(paletteFromPixels([...navy, ...navy, ...navy, ...yellow]).accent).toBe(
      "rgb(250, 220, 40)",
    );
  });
  it("keeps text readable on light and dark thumbnail colors", () => {
    expect(paletteFromPixels([20, 50, 150, 255]).onPrimary).toBe("#ffffff");
    expect(paletteFromPixels([250, 220, 40, 255]).onPrimary).toBe("#21143d");
  });
  it("creates a safe PNG filename", () => {
    expect(shareImageFilename("../My Project / Test!")).toBe("my-project-test-share.png");
    expect(shareImageFilename("✨")).toBe("codecanvas-share.png");
  });
});
