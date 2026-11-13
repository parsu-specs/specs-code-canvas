// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ProfileView from "./ProfileView";
import { getAppRepo, getProfileRepo } from "../data/factory";
import { NotFoundError, type ProfileRepo } from "../data/repositories";
import type { Profile, User } from "../data/types";
import { developerProfilePath } from "../pages/routes";

vi.mock("../data/factory", () => ({ getAppRepo: vi.fn(), getProfileRepo: vi.fn() }));
vi.mock("../auth/authContext", () => ({
  useAuth: () => ({ updateName: vi.fn(), updateCachedProfile: vi.fn() }),
}));

const profile: Profile = {
  id: "dev-123",
  name: "Alex / One",
  role: "Developer",
  bio: "Builds useful apps.",
  color: "mint",
  createdAt: "2026-10-25",
};
let container: HTMLDivElement;
let root: Root;
let repo: ProfileRepo;

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  localStorage.clear();
  repo = {
    listProfiles: vi.fn().mockResolvedValue([profile]),
    getProfile: vi.fn().mockResolvedValue(profile),
    getProfileByName: vi.fn().mockResolvedValue(profile),
    ensureUserProfile: vi.fn().mockResolvedValue(profile),
    updateProfile: vi.fn(),
  };
  vi.mocked(getProfileRepo).mockReturnValue(repo);
  vi.mocked(getAppRepo).mockReturnValue({
    listApps: vi.fn().mockResolvedValue([]),
  } as unknown as ReturnType<typeof getAppRepo>);
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});

async function openProfile(username = profile.name, currentUser: User | null = null) {
  window.history.replaceState({}, "", developerProfilePath(username));
  await act(async () =>
    root.render(
      <ProfileView
        profileId=""
        profileName={username}
        currentUser={currentUser}
        trophies={new Map()}
        projectTrophies={new Map()}
        profiles={new Map()}
        onBack={vi.fn()}
        onOpenApp={vi.fn()}
        onOpenProfile={vi.fn()}
        onSubmitProject={vi.fn()}
      />,
    ),
  );
}

describe("developer username links", () => {
  it("loads an encoded username directly and keeps database IDs out of the URL", async () => {
    await openProfile();
    expect(repo.getProfileByName).toHaveBeenCalledWith(profile.name);
    expect(repo.getProfile).not.toHaveBeenCalled();
    expect(container.textContent).toContain(profile.bio);
    expect(window.location.pathname).toBe("/developers/Alex%20%2F%20One");
  });

  it("recognizes the signed-in developer on their username URL", async () => {
    await openProfile(profile.name, {
      id: profile.id,
      name: profile.name,
      email: "alex@example.com",
    });
    expect(container.textContent).toContain("Edit profile");
    expect(container.textContent).toContain("Your profile");
    expect(container.textContent).toContain("Guest");
    expect(container.textContent).not.toContain("Submit project");
    await act(async () => {
      Array.from(container.querySelectorAll("button"))
        .find((button) => button.textContent?.includes("Edit profile"))!
        .click();
    });
    expect(container.querySelector('input[placeholder="e.g. Frontend development"]')).toBeNull();
    expect(container.textContent).toContain("Guest");
    expect(
      Array.from(container.querySelectorAll("label")).some(
        (label) => label.textContent?.trim() === "Role",
      ),
    ).toBe(false);
  });

  it("resolves old ID links and replaces them with the username URL", async () => {
    vi.mocked(repo.getProfileByName).mockResolvedValue(null);
    await openProfile(profile.id);
    expect(repo.getProfile).toHaveBeenCalledWith(profile.id);
    expect(container.textContent).toContain(profile.bio);
    expect(window.location.pathname).toBe(developerProfilePath(profile.name));
  });

  it("shows the existing not-found state for an unknown username", async () => {
    vi.mocked(repo.getProfileByName).mockResolvedValue(null);
    vi.mocked(repo.getProfile).mockRejectedValue(new NotFoundError("Developer not found."));
    await openProfile("unknown");
    expect(container.textContent).toContain("Developer not found");
  });

  it("rejects partial username matches returned by a backend", async () => {
    await openProfile("Alex%One");
    expect(container.textContent).toContain("Developer not found");
    expect(container.textContent).not.toContain(profile.bio);
  });
});
