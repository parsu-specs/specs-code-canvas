// @vitest-environment jsdom
import { act, type ComponentProps } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { Code } from "@phosphor-icons/react";
import DiscoverPage from "./DiscoverPage";
import type { AppItem } from "../../data/types";

const logo = "data:image/png;base64,YQ==";
const app: AppItem = {
  id: "study",
  title: "Study Buddy",
  description: "A place to learn.",
  creator: "Alex",
  category: "Productivity",
  color: "mint",
  votes: 3,
  comments: 2,
  createdAt: "2026-11-17",
  icon: logo,
  screenshots: ["https://example.com/cover.png"],
};
let root: Root;
let container: HTMLDivElement;
let props: ComponentProps<typeof DiscoverPage>;
beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  props = {
    apps: [app, { ...app, id: "notes", title: "Notes Canvas", icon: undefined, screenshots: [] }],
    appsLoading: false,
    appsError: null,
    loadApps: vi.fn(),
    category: "Productivity",
    categories: [
      { label: "All", Icon: Code },
      { label: "Productivity", Icon: Code },
    ],
    setCategory: vi.fn(),
    query: "",
    setQuery: vi.fn(),
    user: null,
    showForm: false,
    promptDismissed: true,
    canSubmitProject: false,
    expandedId: null,
    profilesLookup: new Map(),
    trophies: new Map(),
    projectRanks: new Map(),
    vote: vi.fn(),
    openApp: vi.fn(),
    openProfile: vi.fn(),
  } as unknown as ComponentProps<typeof DiscoverPage>;
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});
const render = () => act(async () => root.render(<DiscoverPage {...props} />));
const listView = () =>
  act(async () => container.querySelector<HTMLButtonElement>('[aria-label="List view"]')!.click());

it("switches layouts while retaining projects, filters, and project actions", async () => {
  await render();
  expect(container.querySelector(".discovery-grid")).not.toBeNull();
  expect(container.querySelector('img[alt="Study Buddy thumbnail"]')).not.toBeNull();
  await listView();
  expect(container.querySelector(".discovery-grid")).toBeNull();
  expect(container.querySelector('[aria-label="List view"]')?.getAttribute("aria-pressed")).toBe(
    "true",
  );
  expect(container.querySelectorAll("article")).toHaveLength(2);
  expect(container.querySelector('img[alt="Study Buddy thumbnail"]')).toBeNull();
  expect(container.querySelector(`img[src="${logo}"]`)).not.toBeNull();
  expect(container.querySelector("[data-project-icon-placeholder]")?.textContent).toBe("NC");
  expect(container.querySelector('[aria-label="Project categories: Productivity"]')).not.toBeNull();
  await act(async () =>
    container.querySelector<HTMLButtonElement>('[aria-label="Open Study Buddy details"]')!.click(),
  );
  expect(props.openApp).toHaveBeenCalledWith("study");
  expect(container.querySelector('[aria-label="Like project"]')).toBeNull();
  expect(container.textContent).not.toContain("Show comments");
  expect(container.textContent).not.toContain(app.description);
  await act(async () =>
    container.querySelector<HTMLButtonElement>('[aria-label="Grid view"]')!.click(),
  );
  expect(container.querySelector(".discovery-grid")).not.toBeNull();
  expect(container.querySelector('img[alt="Study Buddy thumbnail"]')).not.toBeNull();
  expect(container.textContent).toContain(app.description);
  expect(container.textContent).toContain("Show comments");
  await act(async () =>
    container.querySelector<HTMLButtonElement>('[aria-label="Like project"]')!.click(),
  );
  expect(props.vote).toHaveBeenCalledWith("study");
});

it("restores the Discover layout after reopening the page", async () => {
  await render();
  await listView();
  await act(async () => root.render(null));
  await render();
  expect(container.querySelector('[aria-label="List view"]')?.getAttribute("aria-pressed")).toBe(
    "true",
  );
  expect(container.querySelector(".discovery-grid")).toBeNull();
});

it("uses square initials with the exact cover placeholder artwork when a logo fails", async () => {
  await render();
  await listView();
  const image = container.querySelector<HTMLImageElement>(`img[src="${logo}"]`)!;
  await act(async () => image.dispatchEvent(new Event("error")));
  const placeholder = container.querySelector("[data-project-icon-placeholder]")!;
  const artwork = placeholder.querySelector<HTMLElement>("[data-project-placeholder]")!;
  expect(placeholder.textContent).toBe("SB");
  expect(artwork.style.backgroundColor).toBe("var(--color-mint)");
  expect(artwork.className).toContain("bg-[repeating-linear-gradient");
  expect(placeholder.className).toContain("size-14");
  expect(container.querySelector(`img[src="${logo}"]`)).toBeNull();
});

it("uses list placeholders when switching views while projects load", async () => {
  props = { ...props, apps: [], appsLoading: true };
  await render();
  expect(container.querySelector(".discovery-grid")).not.toBeNull();
  await listView();
  expect(container.querySelector(".discovery-grid")).toBeNull();
  expect(container.textContent).toContain("Loading projects");
});
