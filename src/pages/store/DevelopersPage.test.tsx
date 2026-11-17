// @vitest-environment jsdom
import { act, type ComponentProps } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import DevelopersPage from "./DevelopersPage";
import type { Profile } from "../../data/types";

const profiles: Profile[] = [
  {
    id: "member",
    name: "alex",
    fullName: "Alex Reyes",
    role: "Member",
    bio: "Builds useful tools.",
    color: "sky",
    createdAt: "2026-11-17",
  },
  {
    id: "guest",
    name: "sam",
    role: "Guest",
    bio: "Learning to build.",
    color: "mint",
    createdAt: "2026-11-17",
  },
];
let root: Root;
let container: HTMLDivElement;
let props: ComponentProps<typeof DevelopersPage>;
beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  props = {
    countFor: vi.fn((profile) => (profile.id === "member" ? 2 : 0)),
    devQuery: "",
    filteredProfiles: profiles,
    openProfile: vi.fn(),
    setDevQuery: vi.fn(),
    trophies: new Map([["member", 1]]),
    view: "developers",
    profilesLoading: false,
    profilesError: null,
    setProfileTick: vi.fn(),
  };
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});
const render = () => act(async () => root.render(<DevelopersPage {...props} />));
const cards = () => Array.from(container.querySelectorAll("article"));
const click = async (label: string) => {
  const button = Array.from(container.querySelectorAll("button")).find(
    (item) => item.textContent?.trim() === label,
  )!;
  await act(async () => button.click());
};

it("shows separate developer cards with profile details and project counts", async () => {
  await render();
  expect(cards()).toHaveLength(2);
  expect(cards()[0].textContent).toContain("Alex Reyes");
  expect(cards()[0].textContent).toContain("Builds useful tools.");
  expect(cards()[0].textContent).toContain("2 projects shared");
  expect(cards()[1].textContent).toContain("0 projects shared");
  expect(container.querySelector('[aria-label="Ranked #1"]')).not.toBeNull();
  expect(container.querySelector('input[type="search"]')?.closest("label")).toBeNull();
  await act(async () =>
    container.querySelector<HTMLAnchorElement>('[aria-label="View alex\'s profile"]')!.click(),
  );
  expect(props.openProfile).toHaveBeenCalledWith("member");
});

it("filters roles, retains the filter when changing layout, and clears empty results", async () => {
  await render();
  await click("Members");
  expect(cards()).toHaveLength(1);
  expect(cards()[0].textContent).toContain("alex");
  await act(async () =>
    container.querySelector<HTMLButtonElement>('[aria-label="List view"]')!.click(),
  );
  expect(cards()).toHaveLength(1);
  expect(container.querySelector('[aria-label="List view"]')?.getAttribute("aria-pressed")).toBe(
    "true",
  );
  expect(cards()[0].textContent).not.toContain(profiles[0].bio);
  expect(cards()[0].textContent).not.toContain("projects shared");
  await click("Guests");
  expect(cards()).toHaveLength(1);
  expect(cards()[0].textContent).toContain("sam");
  props = { ...props, devQuery: "missing", filteredProfiles: [] };
  await render();
  expect(container.textContent).toContain("No developers found");
  await click("Clear filters");
  expect(props.setDevQuery).toHaveBeenCalledWith("");
  expect(
    container.querySelector('[aria-label="Developer roles"] button')?.getAttribute("aria-pressed"),
  ).toBe("true");
});

it("shows a retry action after a load error", async () => {
  props = { ...props, profilesError: "Could not load developers." };
  await render();
  expect(cards()).toHaveLength(0);
  await click("Retry");
  expect(props.setProfileTick).toHaveBeenCalledOnce();
});

it("restores the Developers layout after reopening the page", async () => {
  await render();
  await act(async () =>
    container.querySelector<HTMLButtonElement>('[aria-label="List view"]')!.click(),
  );
  await act(async () => root.render(null));
  await render();
  expect(container.querySelector('[aria-label="List view"]')?.getAttribute("aria-pressed")).toBe(
    "true",
  );
  expect(cards()[0].textContent).not.toContain(profiles[0].bio);
});

it("selects roles through the filter inside the search field", async () => {
  await render();
  const search = container.querySelector('input[aria-label="Search developers"]')!;
  const filter = search.parentElement!.querySelector<HTMLButtonElement>(
    '[aria-label="Developer roles: All developers"]',
  )!;
  expect(filter).not.toBeNull();
  await act(async () => filter.click());
  const options = document.querySelector('[aria-modal="true"][aria-label="Developer roles"]')!;
  const guests = Array.from(options.querySelectorAll<HTMLButtonElement>('[role="option"]')).find(
    (item) => item.textContent?.trim() === "Guests",
  )!;
  await act(async () => guests.click());
  expect(cards()).toHaveLength(1);
  expect(cards()[0].textContent).toContain("sam");
  expect(filter.getAttribute("aria-label")).toBe("Developer roles: Guests");
});
