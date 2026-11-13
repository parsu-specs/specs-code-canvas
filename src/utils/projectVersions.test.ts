import { describe, expect, it } from "vitest";
import { suggestedVersion, validateVersion } from "./projectVersions";

describe("project version suggestions", () => {
  it("offers stage defaults and increments numbered versions without forcing them", () => {
    expect(suggestedVersion("Visual prototype")).toBe("v0.1");
    expect(suggestedVersion("Beta")).toBe("v0.9");
    expect(suggestedVersion("Released")).toBe("v1.0");
    expect(suggestedVersion("Working prototype", "v0.1")).toBe("v0.2");
    expect(suggestedVersion("Beta", "v0.2")).toBe("v0.9");
    expect(suggestedVersion("Released", "v0.9-beta")).toBe("v1.0");
    expect(suggestedVersion("Released", "v2")).toBe("v3");
    expect(() => validateVersion("Concept", "v3.0")).not.toThrow();
    expect(() => validateVersion("Released", "v1.0-beta.2")).not.toThrow();
  });

  it("rejects invalid stages, malformed or oversized labels, and empty or oversized release notes", () => {
    expect(() => validateVersion("In development", "v1.0")).toThrow("stage");
    expect(() => validateVersion("Beta", "latest")).toThrow("Use a version");
    expect(() => validateVersion("Beta", `v1-${"a".repeat(40)}`)).toThrow("40 characters");
    expect(() => validateVersion("Beta", "v0.9", " ")).toThrow("Describe what changed");
    expect(() => validateVersion("Beta", "v0.9", "a".repeat(2001))).toThrow("2000 characters");
  });
});
