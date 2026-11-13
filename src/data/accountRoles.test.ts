import { describe, expect, it } from "vitest";
import { accountRole, canSubmitProjects, rejectRolePatch } from "./accountRoles";

describe("account membership", () => {
  it("requires an explicit Member role, including for administrators", () => {
    for (const role of [
      undefined,
      "",
      "Guest",
      "Community member",
      "SPECS member",
      "Admin",
      "Developer",
    ]) {
      expect(accountRole(role)).toBe("Guest");
      expect(canSubmitProjects(role === undefined ? null : { role })).toBe(false);
    }
    expect(canSubmitProjects({ role: "Member" })).toBe(true);
  });

  it("rejects role fields from untyped clients too", () => {
    expect(() => rejectRolePatch({ role: "Member" })).toThrow("admin console");
    expect(() => rejectRolePatch({ bio: "Updated" })).not.toThrow();
  });
});
