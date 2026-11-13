// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, it, vi } from "vitest";
import FeedProjectPicker from "./FeedProjectPicker";
import type { AppItem } from "../../data/types";

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;
const user = { id: "me", name: "Alex", email: "alex@example.com" };
const project = (id: string, creatorId: string, collaborators: string[] = []): AppItem => ({
  id,
  title: id,
  creatorId,
  creator: creatorId === "me" ? "Alex" : "Sam",
  collaborators,
  description: "A project",
  category: "Creative",
  color: "mint",
  votes: 0,
  comments: 0,
  createdAt: "2026-11-13T00:00:00Z",
});
const projects = [
  project("Personal", "me"),
  project("Collaboration", "other", ["me"]),
  project("Community", "other"),
];
let cleanup = () => {};
afterEach(() => cleanup());

function renderPicker(selectedId = "") {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  const onSelect = vi.fn();
  const onClose = vi.fn();
  act(() =>
    root.render(
      <FeedProjectPicker
        projects={projects}
        profiles={[]}
        user={user}
        selectedId={selectedId}
        onSelect={onSelect}
        onClose={onClose}
      />,
    ),
  );
  cleanup = () => {
    act(() => root.unmount());
    container.remove();
  };
  const button = (label: string) =>
    Array.from(document.querySelectorAll("button")).find((element) =>
      element.textContent?.includes(label),
    )!;
  const titles = () => document.querySelector('ul[aria-label="Projects"]')!.textContent;
  return { button, titles, onSelect, onClose };
}

it("includes personal projects and collaborations, and can select someone else's project", () => {
  const { button, titles, onSelect, onClose } = renderPicker();
  expect(titles()).toContain("Personal");
  expect(titles()).toContain("Collaboration");
  expect(titles()).not.toContain("Community");
  act(() => button("All projects").click());
  expect(titles()).toContain("Community");
  act(() => button("Community").click());
  expect(onSelect).toHaveBeenCalledWith("Community");
  expect(onClose).toHaveBeenCalledOnce();
});

it("searches projects and creators, and shows an empty state", () => {
  const { button, titles } = renderPicker();
  act(() => button("All projects").click());
  const input = document.querySelector('input[type="search"]') as HTMLInputElement;
  const search = (value: string) =>
    act(() => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, value);
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
  search("sam");
  expect(titles()).not.toContain("Personal");
  expect(titles()).toContain("Collaboration");
  expect(titles()).toContain("Community");
  search("  community  ");
  expect(titles()).toContain("Community");
  expect(titles()).not.toContain("Collaboration");
  search("missing");
  expect(document.querySelector('[role="status"]')?.textContent).toContain("No matching projects");
});

it("dismisses without changing the selection and keeps unlinking outside the picker", () => {
  const { button, onSelect, onClose } = renderPicker("Personal");
  expect(button("Personal").getAttribute("aria-pressed")).toBe("true");
  act(() =>
    document.querySelector<HTMLButtonElement>('[aria-label="Close link a project"]')!.click(),
  );
  expect(onClose).toHaveBeenCalledOnce();
  expect(onSelect).not.toHaveBeenCalled();
  expect(document.body.textContent).not.toContain("No linked project");
});
