// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import ProjectView from "./ProjectView";
import type { AppItem, User } from "../data/types";

const repo = vi.hoisted(() => ({
  getApp: vi.fn(),
  deleteApp: vi.fn(),
  getProfile: vi.fn().mockResolvedValue(null),
  getProfileByName: vi.fn().mockResolvedValue(null),
}));
vi.mock("../data/factory", () => ({ getAppRepo: () => repo, getProfileRepo: () => repo }));
vi.mock("./Comments", () => ({ default: () => null }));
vi.mock("./ShareButton", () => ({ default: () => null }));

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

const user: User = { id: "owner", name: "Owner", email: "owner@example.com" };
const project: AppItem = {
  id: "project-1",
  title: "My project",
  description: "Project description",
  creator: user.name,
  creatorId: user.id,
  category: "Productivity",
  votes: 0,
  comments: 0,
  color: "mint",
  createdAt: "2026-01-01",
  stage: "Concept",
};
let cleanup = () => {};
let frames: Map<number, FrameRequestCallback>;
let scroll = vi.fn<HTMLElement["scrollIntoView"]>();

beforeEach(() => {
  frames = new Map();
  let sequence = 0;
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    frames.set(++sequence, callback);
    return sequence;
  });
  vi.stubGlobal("cancelAnimationFrame", (id: number) => frames.delete(id));
  vi.stubGlobal("matchMedia", () => ({ matches: false }));
  scroll = vi.fn<HTMLElement["scrollIntoView"]>();
  HTMLElement.prototype.scrollIntoView = scroll;
});

afterEach(() => {
  cleanup();
  Reflect.deleteProperty(HTMLElement.prototype, "scrollIntoView");
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

function renderProject(startEditing = true, currentUser: User | null = user, onDeleted = vi.fn()) {
  const container = document.createElement("div");
  document.body.append(container);
  container.id = "root";
  const root = createRoot(container);
  act(() =>
    root.render(
      <ProjectView
        appId={project.id}
        currentUser={currentUser}
        profiles={new Map()}
        trophies={new Map()}
        projectTrophies={new Map()}
        startEditing={startEditing}
        onBack={vi.fn()}
        onOpenProfile={vi.fn()}
        onChanged={vi.fn()}
        onDeleted={onDeleted}
      />,
    ),
  );
  cleanup = () => {
    act(() => root.unmount());
    container.remove();
  };
  return container;
}

function paint() {
  const callbacks = [...frames.values()];
  frames.clear();
  act(() => callbacks.forEach((callback) => callback(0)));
}

it.each([false, true])(
  "waits for project details before opening the editor modal (reduced motion: %s)",
  async (reducedMotion) => {
    vi.stubGlobal("matchMedia", (query: string) => ({
      matches: query === "(prefers-reduced-motion: reduce)" && reducedMotion,
    }));
    let resolve!: (app: AppItem) => void;
    repo.getApp.mockReturnValue(
      new Promise<AppItem>((done) => {
        resolve = done;
      }),
    );
    const container = renderProject();
    paint();
    expect(container.querySelector("form")).toBeNull();
    expect(scroll).not.toHaveBeenCalled();
    await act(async () => resolve(project));
    const form = document.querySelector<HTMLFormElement>("#edit-project-details")!;
    expect(form).not.toBeNull();
    expect(form.querySelector<HTMLInputElement>('input[placeholder="Project name"]')?.value).toBe(
      project.title,
    );
    paint();
    expect(scroll).not.toHaveBeenCalled();
    expect(document.querySelector('[role="dialog"]')?.contains(form)).toBe(true);
    expect(container.contains(form)).toBe(false);
    expect(document.querySelector(".sheet-overlay")).not.toBeNull();
    expect(document.body.style.overflow).toBe("hidden");
    expect(container.inert).toBe(true);
    expect(form.contains(document.activeElement)).toBe(true);
  },
);

it.each(["Edit project details", "Publish an update"])(
  "opens %s in the shared responsive modal and restores focus after closing",
  async (action) => {
    vi.useFakeTimers();
    try {
      repo.getApp.mockResolvedValue(project);
      const container = renderProject(false);
      await act(async () => {});
      const trigger = button(container, action);
      trigger.focus();
      act(() => trigger.click());
      const dialog = document.querySelector<HTMLElement>('[role="dialog"]')!;
      expect(dialog).not.toBeNull();
      expect(dialog.querySelector("h2")?.textContent).toBe(action);
      expect(
        dialog.querySelector('textarea[placeholder="Describe what is new in this version"]') !==
          null,
      ).toBe(action === "Publish an update");
      expect(dialog.contains(document.activeElement)).toBe(true);
      expect(scroll).not.toHaveBeenCalled();
      act(() => button(dialog, "Cancel").click());
      expect(document.querySelector('.sheet-overlay[data-closing="true"]')).not.toBeNull();
      await act(async () => {
        await vi.advanceTimersByTimeAsync(220);
      });
      expect(document.querySelector('[role="dialog"]')).toBeNull();
      expect(document.body.style.overflow).toBe("");
      expect(container.inert).toBe(false);
      expect(document.activeElement).toBe(trigger);
    } finally {
      vi.useRealTimers();
    }
  },
);

it("does not open another developer's editor from an edit request", async () => {
  repo.getApp.mockResolvedValue(project);
  const container = renderProject(true, { ...user, id: "other" });
  await act(async () => {});
  paint();
  expect(document.querySelector("#edit-project-details")).toBeNull();
  expect(scroll).not.toHaveBeenCalled();
});

function button(container: HTMLElement, text: string) {
  return Array.from(container.querySelectorAll("button")).find((item) =>
    item.textContent?.includes(text),
  )!;
}

it("requires confirmation and allows keeping an owned project without opening the editor", async () => {
  repo.getApp.mockResolvedValue(project);
  const container = renderProject(false);
  await act(async () => {});
  act(() => button(container, "Delete project").click());
  expect(container.querySelector("form")).toBeNull();
  expect(container.querySelector('[aria-label="Confirm project deletion"]')).not.toBeNull();
  expect(repo.deleteApp).not.toHaveBeenCalled();
  act(() => button(container, "Keep it").click());
  expect(container.querySelector('[aria-label="Confirm project deletion"]')).toBeNull();
  expect(repo.deleteApp).not.toHaveBeenCalled();
});

it.each([null, { ...user, id: "other" }])("hides delete for non-owners (%s)", async (viewer) => {
  repo.getApp.mockResolvedValue(project);
  const container = renderProject(false, viewer);
  await act(async () => {});
  expect(button(container, "Delete project")).toBeUndefined();
});

it("disables repeated deletion while pending and navigates only after success", async () => {
  repo.getApp.mockResolvedValue(project);
  let resolve!: () => void;
  repo.deleteApp.mockReturnValue(
    new Promise<void>((done) => {
      resolve = done;
    }),
  );
  const onDeleted = vi.fn();
  const container = renderProject(false, user, onDeleted);
  await act(async () => {});
  act(() => button(container, "Delete project").click());
  act(() => button(container, "Yes, delete it").click());
  expect(repo.deleteApp).toHaveBeenCalledExactlyOnceWith(project.id, user);
  expect(button(container, "Deleting").disabled).toBe(true);
  expect(button(container, "Keep it").disabled).toBe(true);
  expect(onDeleted).not.toHaveBeenCalled();
  await act(async () => resolve());
  expect(onDeleted).toHaveBeenCalledOnce();
});

it("keeps the project and shows an error when deletion fails", async () => {
  repo.getApp.mockResolvedValue(project);
  repo.deleteApp.mockRejectedValue(new Error("Could not delete project."));
  const onDeleted = vi.fn();
  const container = renderProject(false, user, onDeleted);
  await act(async () => {});
  act(() => button(container, "Delete project").click());
  await act(async () => button(container, "Yes, delete it").click());
  expect(container.textContent).toContain("Could not delete project.");
  expect(button(container, "Yes, delete it").disabled).toBe(false);
  expect(onDeleted).not.toHaveBeenCalled();
});
