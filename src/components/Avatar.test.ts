import { describe, expect, it } from "vitest";
import { initials } from "./Avatar";

describe("avatar initials", () => {
  it.each([
    ["alex reyes", "AR"],
    ["  alex\t\nreyes  ", "AR"],
    ["@alex_123", "A"],
    ["123 alex / reyes", "AR"],
    ["élise ñora", "ÉÑ"],
    ["alex reyes cruz", "AR"],
    ["123_!", ""],
    ["", ""],
  ])("uses uppercase letters from %j", (name, expected) => {
    expect(initials(name)).toBe(expected);
  });
});
