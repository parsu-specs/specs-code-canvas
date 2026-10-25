// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import ShareButton from "./ShareButton";
import type { AppItem, Profile } from "../data/types";
import { DEFAULT_SHARE_PALETTE, prepareShareImage, shareColorContrast } from "../utils/shareImage";
import { toBlob } from "html-to-image";

vi.mock("html-to-image", () => ({ toBlob: vi.fn() }));
vi.mock("../utils/shareImage", async (original) => ({
  ...(await original<typeof import("../utils/shareImage")>()),
  prepareShareImage: vi.fn(),
}));

const app: AppItem = {
  id: "project / 1",
  title: "Study Buddy",
  description: "Study together.",
  creator: "Alex",
  category: "Education",
  votes: 0,
  comments: 0,
  color: "mint",
  createdAt: "2026-10-25",
  url: "https://study.example",
  repoUrl: "https://github.com/alex/study",
};
const profile: Profile = {
  id: "alex / 1",
  name: "Alex",
  role: "Developer",
  bio: "I build things.",
  color: "mint",
  createdAt: "2026-10-25",
};
let container: HTMLDivElement;
let root: Root;
const writeText = vi.fn();

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.clearAllMocks();
  writeText.mockResolvedValue(undefined);
  Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
  Object.defineProperty(document, "fonts", {
    configurable: true,
    value: { ready: Promise.resolve() },
  });
  vi.mocked(toBlob).mockResolvedValue(new Blob(["png"], { type: "image/png" }));
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});
async function click(text: string) {
  const button = Array.from(document.querySelectorAll("button")).find((element) =>
    element.textContent?.includes(text),
  );
  expect(button, `Button: ${text}`).toBeTruthy();
  await act(async () => button!.click());
}
async function openProject(value = app) {
  await act(async () => root.render(<ShareButton app={value} />));
  await click("Share");
}

describe("sharing projects and developers", () => {
  it("opens a modal and copies distinct CodeCanvas, repository, and app links", async () => {
    await openProject();
    expect(document.querySelector('[role="dialog"]')).toBeTruthy();
    await click("Copy project link");
    expect(writeText).toHaveBeenLastCalledWith(`${window.location.origin}/apps/project%20%2F%201`);
    await click("Copy GitHub");
    expect(writeText).toHaveBeenLastCalledWith(app.repoUrl);
    await click("Copy app link");
    expect(writeText).toHaveBeenLastCalledWith(app.url);
  });
  it("omits missing and unsafe external links", async () => {
    await openProject({ ...app, url: undefined, repoUrl: "javascript:alert(1)" });
    expect(document.body.textContent).not.toContain("Copy GitHub");
    expect(document.body.textContent).not.toContain("Copy app link");
  });
  it("offers a selectable link if clipboard permission is denied", async () => {
    writeText.mockRejectedValue(new Error("Denied"));
    await openProject();
    await click("Copy app link");
    const input = document.querySelector<HTMLInputElement>('input[aria-label="Link to copy"]')!;
    expect(input.value).toBe(app.url);
    expect(document.activeElement).toBe(input);
    expect(input.selectionEnd).toBe(input.value.length);
  });
  it("shares the developer's canonical profile, including their own profile", async () => {
    await act(async () => root.render(<ShareButton profile={profile} />));
    await click("Share");
    await click("Copy developer link");
    expect(writeText).toHaveBeenCalledWith(`${window.location.origin}/developers/Alex`);
    expect(document.body.textContent).not.toContain("Copy app link");
  });
  it.each(["developer", "project"] as const)(
    "applies the lighter-first two-tone adjustment to %s share photos with images as intended",
    async (kind) => {
      vi.mocked(prepareShareImage).mockResolvedValue({
        dataUrl: "data:image/png;base64,dGh1bWI=",
        palette: { ...DEFAULT_SHARE_PALETTE, primary: "#ffe064", accent: "#ffebb0" },
      });
      if (kind === "developer") {
        await act(async () =>
          root.render(
            <ShareButton profile={{ ...profile, imageUrl: "https://example.com/avatar.png" }} />,
          ),
        );
        await click("Share");
      } else await openProject({ ...app, screenshots: ["https://example.com/cover.png"] });
      await click("Share photo");
      const first = getComputedStyle(document.querySelector(".share-photo-header")!).color;
      const second = getComputedStyle(document.querySelector(".share-photo-monogram span")!).color;
      if (kind === "developer") {
        expect(shareColorContrast(first, "#000000")).toBeGreaterThan(
          shareColorContrast(second, "#000000"),
        );
        expect(shareColorContrast(first, "#ffe064")).toBeGreaterThanOrEqual(4.5);
        expect(shareColorContrast(second, "#ffe064")).toBeGreaterThanOrEqual(4.5);
      } else expect(first).toBe(second);
    },
  );
  it("embeds the thumbnail and exports the HTML card at 2160 by 2160", async () => {
    const image = "data:image/png;base64,dGh1bWI=";
    vi.mocked(prepareShareImage).mockResolvedValue({
      dataUrl: image,
      palette: DEFAULT_SHARE_PALETTE,
    });
    await openProject({ ...app, screenshots: ["https://example.com/thumbnail.png"] });
    await click("Share photo");
    expect(document.querySelector<HTMLImageElement>(".share-photo-frame img")?.src).toBe(image);
    await click("Create PNG");
    expect(toBlob).toHaveBeenCalledWith(
      expect.any(HTMLDivElement),
      expect.objectContaining({
        width: 1080,
        height: 1080,
        pixelRatio: 2,
        style: { transform: "none", margin: "0" },
      }),
    );
    expect(document.body.textContent).toContain("Download PNG");
  });
  it("shows one main app link while preserving the footer links", async () => {
    await openProject();
    await click("Share photo");
    const photo = document.querySelector(".share-photo")!;
    expect(photo.querySelectorAll(".share-photo-url")).toHaveLength(1);
    expect(photo.querySelector(".share-photo-url")?.textContent).toContain("study.example");
    expect(photo.textContent).not.toContain("/apps/");
    expect(photo.querySelector(".share-photo-credits")?.textContent).toContain(
      "facebook.com/parsu.specs",
    );
    expect(photo.querySelector(".share-photo-credits")?.textContent).toContain(
      "parsu.specs@gmail.com",
    );
  });
  it.each(["mint", "pink", "sky"])(
    "uses the existing %s project placeholder and assigned palette when no thumbnail exists",
    async (color) => {
      await openProject({ ...app, color, title: "lowercase project", screenshots: ["   "] });
      await click("Share photo");
      const placeholder = document.querySelector<HTMLElement>(
        ".share-photo-image [data-project-placeholder]",
      )!;
      expect(placeholder).toBeTruthy();
      expect(placeholder.style.backgroundColor).toBe(`var(--color-${color})`);
      expect(placeholder.textContent).toBe("l");
      expect(placeholder.className).toContain("repeating-linear-gradient");
      expect(document.querySelector<HTMLElement>(".share-photo-header")!.style.background).toBe(
        `var(--color-${color})`,
      );
      expect(prepareShareImage).not.toHaveBeenCalled();
      await click("Create PNG");
      expect(toBlob).toHaveBeenCalled();
    },
  );
  it("can regenerate a previously created PNG from the current preview", async () => {
    await openProject();
    await click("Share photo");
    await click("Create PNG");
    expect(toBlob).toHaveBeenCalledTimes(1);
    await click("Regenerate PNG");
    expect(toBlob).toHaveBeenCalledTimes(2);
    expect(document.body.textContent).toContain("Your PNG is ready to download or share.");
  });
  it.each([undefined, "javascript:alert(1)"])(
    "omits the photo link when the app URL is %s",
    async (url) => {
      await openProject({ ...app, url });
      await click("Share photo");
      expect(document.querySelector(".share-photo-url")).toBeNull();
    },
  );
  it("cleans a double-pasted app link only in the share photo", async () => {
    const mediafire = "https://www.mediafire.com/file/6bqic78b4l0zlu4/CoffeeLog.apk/file";
    const duplicated = `${mediafire}${mediafire}`;
    await openProject({ ...app, url: duplicated });
    await click("Share photo");
    expect(document.querySelector(".share-photo-url")?.textContent?.trim()).toBe(
      mediafire.replace("https://", ""),
    );
    expect(document.querySelector(".share-photo-credits")?.textContent).toContain(
      "facebook.com/parsu.specs",
    );
    await click("Copy app link");
    expect(writeText).toHaveBeenLastCalledWith(duplicated);
  });
  it("prevents export when the thumbnail host blocks access", async () => {
    vi.mocked(prepareShareImage).mockRejectedValue(new Error("CORS"));
    await openProject({ ...app, screenshots: ["https://example.com/blocked.png"] });
    await click("Share photo");
    expect(document.querySelector('[role="alert"]')?.textContent).toContain(
      "could not be prepared",
    );
    await click("Create PNG");
    expect(toBlob).not.toHaveBeenCalled();
  });
  it("keeps modal interactions from opening the surrounding project card", async () => {
    const onOpen = vi.fn();
    await act(async () =>
      root.render(
        <article onClick={onOpen}>
          <ShareButton app={app} />
        </article>,
      ),
    );
    await click("Share");
    await click("Share photo");
    await act(async () => document.querySelector<HTMLElement>(".share-photo")!.click());
    expect(onOpen).not.toHaveBeenCalled();
    await act(async () =>
      document
        .querySelector('[role="dialog"]')!
        .dispatchEvent(
          new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true }),
        ),
    );
    expect(document.querySelector('[role="dialog"]')).toBeNull();
  });
});
