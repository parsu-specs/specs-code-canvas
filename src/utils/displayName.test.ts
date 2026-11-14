import { afterEach, describe, expect, it, vi } from "vitest";
import type { ProfileRepo } from "../data/repositories";
import { confirmDisplayNameChange } from "./displayName";

afterEach(() => vi.unstubAllGlobals());

describe("username changes", () => {
  const profile = { id: "me", name: "Original" };

  function setup(existing: { id: string } | null = null, accepted = true) {
    const confirm = vi.fn(() => accepted);
    vi.stubGlobal("window", { confirm });
    const getProfileByName = vi.fn().mockResolvedValue(existing);
    const repo = { getProfileByName } as unknown as ProfileRepo;
    return { repo, confirm, getProfileByName };
  }

  it("rejects a taken name before prompting", async () => {
    const { repo, confirm } = setup({ id: "someone-else" });
    await expect(confirmDisplayNameChange(repo, profile, "Taken", confirm)).rejects.toThrow(
      "already taken",
    );
    expect(confirm).not.toHaveBeenCalled();
  });

  it("checks the trimmed name and warns that the old name becomes available", async () => {
    const { repo, confirm, getProfileByName } = setup();
    expect(await confirmDisplayNameChange(repo, profile, " new-name ", confirm)).toBe(true);
    expect(getProfileByName).toHaveBeenCalledWith("new-name");
    expect(confirm).toHaveBeenCalledWith(
      expect.stringContaining("“Original”, will become available for others to take"),
    );
  });

  it("allows the user to cancel", async () => {
    const { repo, confirm } = setup(null, false);
    expect(await confirmDisplayNameChange(repo, profile, "new-name", confirm)).toBe(false);
  });

  it("does not check or prompt for an unchanged name", async () => {
    const { repo, confirm, getProfileByName } = setup();
    expect(await confirmDisplayNameChange(repo, profile, " Original ", confirm)).toBe(true);
    expect(getProfileByName).not.toHaveBeenCalled();
    expect(confirm).not.toHaveBeenCalled();
  });

  it("does not warn about releasing a name when only its case changes", async () => {
    const { repo, confirm } = setup({ id: "me" });
    expect(await confirmDisplayNameChange(repo, profile, "ORIGINAL", confirm)).toBe(true);
    expect(confirm).not.toHaveBeenCalled();
  });
});
