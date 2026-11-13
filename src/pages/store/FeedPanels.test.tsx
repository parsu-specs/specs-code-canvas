// @vitest-environment jsdom
import { act, useState } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, it, vi } from "vitest";
import FeedPanels from "./FeedPanels";
import FeedHighlights from "./FeedHighlights";
import { featuredProjectIds, officialAnnouncements } from "../../data/feedHighlights";
import type { AppItem } from "../../data/types";

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;
let cleanup = () => {};
afterEach(() => cleanup());

function mount(element: React.ReactNode) {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  act(() => root.render(element));
  cleanup = () => {
    act(() => root.unmount());
    container.remove();
  };
  return container;
}

it("switches panels in both directions while retaining the feed draft", () => {
  function Draft() {
    const [value, setValue] = useState("");
    return (
      <textarea
        aria-label="Draft"
        value={value}
        onChange={(event) => setValue(event.target.value)}
      />
    );
  }
  const container = mount(
    <FeedPanels highlights={<p>Highlights</p>}>
      <Draft />
    </FeedPanels>,
  );
  const draft = container.querySelector("textarea")!;
  act(() => {
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")!.set!.call(
      draft,
      "My unfinished post",
    );
    draft.dispatchEvent(new Event("input", { bubbles: true }));
  });
  const feed = container.querySelector("#feed-community-panel")!;
  const highlights = container.querySelector("#feed-highlights-panel")!;
  expect(feed.classList.contains("hidden")).toBe(false);
  expect(highlights.classList.contains("hidden")).toBe(true);
  act(() =>
    container
      .querySelector<HTMLButtonElement>('[aria-label="Show featured apps and announcements"]')!
      .click(),
  );
  expect(feed.classList.contains("hidden")).toBe(true);
  expect(highlights.classList.contains("hidden")).toBe(false);
  act(() =>
    container.querySelector<HTMLButtonElement>('[aria-label="Show community feed"]')!.click(),
  );
  expect(feed.classList.contains("hidden")).toBe(false);
  expect(draft.value).toBe("My unfinished post");
  expect(container.querySelector("textarea")).toBe(draft);
});

it("opens the curated Document Binder project and displays the official launch announcement", () => {
  const openApp = vi.fn();
  const project: AppItem = {
    id: featuredProjectIds[0],
    title: "Document Binder",
    creator: "Kirby Paladan",
    description: "Organize documents",
    category: "Productivity",
    color: "mint",
    votes: 0,
    comments: 0,
    createdAt: "2026-11-13",
  };
  const container = mount(
    <FeedHighlights projects={[project]} announcements={officialAnnouncements} openApp={openApp} />,
  );
  act(() =>
    container.querySelector<HTMLButtonElement>('[aria-label="Open Document Binder"]')!.click(),
  );
  expect(openApp).toHaveBeenCalledWith("3db46c6c-b342-48d7-b214-3d19467eeaba");
  expect(container.textContent).toContain("November 18, 2026");
  expect(container.textContent).toContain("CodeCanvas opens to everyone");
  expect(container.textContent).not.toContain("\u2014");
});

it("shows empty states when no curated content is available", () => {
  const container = mount(<FeedHighlights projects={[]} announcements={[]} openApp={vi.fn()} />);
  expect(container.textContent).toContain("Featured apps will appear here");
  expect(container.textContent).toContain("No official announcements yet");
});
