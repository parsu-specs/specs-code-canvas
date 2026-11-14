// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ProfileView from "./ProfileView";
import { getAppRepo, getProfileRepo } from "../data/factory";
import { NotFoundError, type ProfileRepo } from "../data/repositories";
import type { Profile, User } from "../data/types";
import { developerProfilePath } from "../pages/routes";
import { fileToThumbnailDataUrl } from "../utils/images";
import type { ImageEditorProps } from "./ImageEditor";

vi.mock("../data/factory", () => ({ getAppRepo: vi.fn(), getProfileRepo: vi.fn() }));
vi.mock("../utils/images", () => ({ fileToThumbnailDataUrl: vi.fn() }));
vi.mock("./ImageEditor", () => ({
  default: ({ file, aspectRatio, circular, onSave, onCancel }: ImageEditorProps) => (
    <section aria-label="Image editor" data-circular={circular} data-ratio={aspectRatio}>
      <span>{file.name}</span>
      <button
        type="button"
        onClick={() => void onSave(new File(["cropped"], "crop.png", { type: "image/png" }))}
      >
        Use image
      </button>
      <button type="button" onClick={onCancel}>
        Cancel edit
      </button>
    </section>
  ),
}));
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
  it("uses the active site theme despite legacy profile colors and saves without color overrides", async () => {
    const legacyProfile = { ...profile, theme: "black" };
    vi.mocked(repo.getProfileByName).mockResolvedValue(legacyProfile);
    vi.mocked(repo.updateProfile).mockResolvedValue(legacyProfile);
    await openProfile(profile.name, {
      id: profile.id,
      name: profile.name,
      email: "alex@example.com",
    });

    const card = container.querySelector(".toon-card.bg-panel")!;
    expect(card.getAttribute("style")).toBeNull();
    const avatar = card.querySelector("span.rounded-full")!;
    expect(avatar.classList.contains("bg-foreground")).toBe(true);
    expect(avatar.classList.contains("text-panel")).toBe(true);
    expect(avatar.getAttribute("style")).toBeNull();

    await act(async () => {
      Array.from(container.querySelectorAll("button"))
        .find((button) => button.textContent?.includes("Edit profile"))!
        .click();
    });
    expect(container.textContent).not.toContain("Avatar color");
    expect(container.querySelector('[aria-label="Profile theme"]')).toBeNull();

    await act(async () => {
      container
        .querySelector("form")!
        .dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    });
    expect(repo.updateProfile).toHaveBeenCalledWith(
      profile.id,
      { name: profile.name, fullName: profile.name, bio: profile.bio },
      profile.id,
    );
  });

  it("shows the full name and username separately while retaining the username URL", async () => {
    vi.mocked(repo.getProfileByName).mockResolvedValue({ ...profile, fullName: "Alex Reyes" });
    await openProfile();
    expect(container.querySelector("h2")?.textContent).toContain("Alex Reyes");
    expect(container.textContent).toContain(`@${profile.name}`);
    expect(window.location.pathname).toBe(developerProfilePath(profile.name));
  });
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

describe("profile picture editor", () => {
  const user: User = { id: profile.id, name: profile.name, email: "alex@example.com" };
  const originalPhoto = "https://example.com/original.jpg";
  const dialog = () => document.querySelector('[role="dialog"]');
  const photo = () => (dialog() ?? container).querySelector<HTMLImageElement>("img.rounded-full");
  const button = (text: string) =>
    Array.from((dialog() ?? container).querySelectorAll("button")).find(
      (item) => item.textContent?.trim() === text,
    )!;
  const openEditor = async () => {
    await act(async () =>
      container.querySelector<HTMLButtonElement>('[aria-label="Edit profile picture"]')!.click(),
    );
  };
  const submitPhoto = async () => {
    await act(async () => {
      document
        .querySelector("#profile-photo-editor form")!
        .dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    });
  };

  it("previews an uploaded photo in the large avatar and saves only the picture", async () => {
    const uploadedPhoto = "data:image/png;base64,YQ==";
    vi.mocked(fileToThumbnailDataUrl).mockResolvedValue(uploadedPhoto);
    vi.mocked(repo.updateProfile).mockResolvedValue({ ...profile, imageUrl: uploadedPhoto });
    await openProfile(profile.name, user);
    await openEditor();
    const file = new File(["photo"], "avatar.png", { type: "image/png" });
    await act(async () => {
      const input = dialog()!.querySelector('input[type="file"]')!;
      Object.defineProperty(input, "files", { value: [file] });
      input.dispatchEvent(new Event("change", { bubbles: true }));
    });
    const editor = dialog()!.querySelector('[aria-label="Image editor"]')!;
    expect(editor.getAttribute("data-circular")).toBe("true");
    expect(editor.getAttribute("data-ratio")).toBe("1");
    await act(async () => button("Use image").click());
    expect(photo()?.getAttribute("src")).toBe(uploadedPhoto);
    expect(fileToThumbnailDataUrl).toHaveBeenCalledWith(
      expect.objectContaining({ name: "crop.png" }),
      256,
    );
    expect(repo.updateProfile).not.toHaveBeenCalled();
    await submitPhoto();
    expect(repo.updateProfile).toHaveBeenCalledWith(
      profile.id,
      { imageUrl: uploadedPhoto },
      profile.id,
    );
    expect(document.querySelector("#profile-photo-editor")).toBeNull();
    expect(photo()?.getAttribute("src")).toBe(uploadedPhoto);
  });

  it("previews default initials and persists the choice", async () => {
    vi.mocked(repo.getProfileByName).mockResolvedValue({ ...profile, imageUrl: originalPhoto });
    vi.mocked(repo.updateProfile).mockResolvedValue({ ...profile, imageUrl: undefined });
    await openProfile(profile.name, user);
    await openEditor();
    await act(async () => button("Use initials").click());
    expect(photo()).toBeNull();
    expect(dialog()!.querySelector("span.rounded-full")?.textContent).toBe("AO");
    expect(button("Use initials").getAttribute("aria-pressed")).toBe("true");
    await submitPhoto();
    expect(repo.updateProfile).toHaveBeenCalledWith(profile.id, { imageUrl: "" }, profile.id);
    expect(photo()).toBeNull();
  });

  it("restores the saved picture when a preview is cancelled", async () => {
    vi.mocked(repo.getProfileByName).mockResolvedValue({ ...profile, imageUrl: originalPhoto });
    await openProfile(profile.name, user);
    await openEditor();
    await act(async () => button("Use initials").click());
    await act(async () => button("Cancel").click());
    expect(photo()?.getAttribute("src")).toBe(originalPhoto);
    expect(repo.updateProfile).not.toHaveBeenCalled();
    await openEditor();
    expect(button("Use initials").getAttribute("aria-pressed")).toBe("false");
  });

  it("opens the picker as a modal and dismisses it with Escape without saving", async () => {
    vi.mocked(repo.getProfileByName).mockResolvedValue({ ...profile, imageUrl: originalPhoto });
    await openProfile(profile.name, user);
    const trigger = container.querySelector<HTMLButtonElement>(
      '[aria-label="Edit profile picture"]',
    )!;
    trigger.focus();
    await openEditor();
    expect(dialog()?.getAttribute("aria-modal")).toBe("true");
    expect(container.querySelector("#profile-photo-editor")).toBeNull();
    await act(async () => button("Use initials").click());
    await act(async () => {
      document.activeElement!.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
      );
    });
    expect(dialog()).toBeNull();
    expect(document.activeElement).toBe(trigger);
    expect(photo()?.getAttribute("src")).toBe(originalPhoto);
    expect(repo.updateProfile).not.toHaveBeenCalled();
  });

  it("keeps the previous picture when an upload crop is cancelled", async () => {
    vi.mocked(repo.getProfileByName).mockResolvedValue({ ...profile, imageUrl: originalPhoto });
    await openProfile(profile.name, user);
    await openEditor();
    await act(async () => {
      const input = dialog()!.querySelector('input[type="file"]')!;
      Object.defineProperty(input, "files", {
        value: [new File(["photo"], "new.png", { type: "image/png" })],
      });
      input.dispatchEvent(new Event("change", { bubbles: true }));
    });
    await act(async () => button("Cancel edit").click());
    expect(photo()?.getAttribute("src")).toBe(originalPhoto);
    expect(repo.updateProfile).not.toHaveBeenCalled();
  });

  it("loads the current picture into the circular editor", async () => {
    const fetchImage = vi.fn().mockResolvedValue({
      ok: true,
      blob: async () => new Blob(["photo"], { type: "image/png" }),
    });
    vi.stubGlobal("fetch", fetchImage);
    vi.mocked(repo.getProfileByName).mockResolvedValue({ ...profile, imageUrl: originalPhoto });
    await openProfile(profile.name, user);
    await openEditor();
    await act(async () => button("Edit image").click());
    expect(fetchImage).toHaveBeenCalledWith(
      originalPhoto,
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
    expect(
      dialog()!.querySelector('[aria-label="Image editor"]')?.getAttribute("data-circular"),
    ).toBe("true");
    expect(repo.updateProfile).not.toHaveBeenCalled();
  });

  it("leaves gallery and initials available when a linked picture cannot be edited", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("CORS")));
    vi.mocked(repo.getProfileByName).mockResolvedValue({ ...profile, imageUrl: originalPhoto });
    await openProfile(profile.name, user);
    await openEditor();
    await act(async () => button("Edit image").click());
    expect(dialog()!.querySelector('[role="alert"]')?.textContent).toContain(
      "Choose an image from your gallery",
    );
    expect(button("Use initials").disabled).toBe(false);
    expect(photo()?.getAttribute("src")).toBe(originalPhoto);
  });

  it("cancels a pending picture download when the modal is closed", async () => {
    const fetchImage = vi.fn().mockReturnValue(new Promise(() => {}));
    vi.stubGlobal("fetch", fetchImage);
    vi.mocked(repo.getProfileByName).mockResolvedValue({ ...profile, imageUrl: originalPhoto });
    await openProfile(profile.name, user);
    await openEditor();
    await act(async () => button("Edit image").click());
    const signal = fetchImage.mock.calls[0][1].signal as AbortSignal;
    await act(async () => button("Cancel").click());
    expect(signal.aborted).toBe(true);
    expect(dialog()).toBeNull();
    expect(repo.updateProfile).not.toHaveBeenCalled();
  });

  it("keeps the preview available after a save failure", async () => {
    vi.mocked(repo.updateProfile).mockRejectedValue(new Error("Could not save profile."));
    await openProfile(profile.name, user);
    await openEditor();
    await submitPhoto();
    expect(dialog()!.querySelector('[role="alert"]')?.textContent).toContain(
      "Could not save profile.",
    );
    expect(document.querySelector("#profile-photo-editor")).not.toBeNull();
    expect(button("Save picture").disabled).toBe(false);
  });

  it("shows the picture editor only on your own profile", async () => {
    await openProfile();
    expect(container.querySelector('[aria-label="Edit profile picture"]')).toBeNull();
    expect(container.querySelector('input[type="file"]')).toBeNull();
  });
});
