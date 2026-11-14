import { describe, expect, it } from "vitest";
import { isValidUsername, usernamePattern, validateUsername } from "./username";

describe("usernames", () => {
  it.each(["alex", "alex_reyes", "alex-reyes", "Alex123", "a".repeat(30)])("accepts %s", (name) => {
    expect(isValidUsername(name)).toBe(true);
  });
  it.each([
    "",
    "ab",
    "a".repeat(31),
    "alex reyes",
    "alex.reyes",
    "alex@reyes",
    "_alex",
    "alex-",
    "álëx",
    "alex\nreyes",
  ])("rejects %s", (name) => {
    expect(() => validateUsername(name)).toThrow("3–30");
  });
  it("escapes underscores for literal database lookups", () => {
    expect(usernamePattern("alex_reyes")).toBe("alex\\_reyes");
  });
});
