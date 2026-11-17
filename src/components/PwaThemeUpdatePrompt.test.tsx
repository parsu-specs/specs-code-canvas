// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import InstallApp from "./InstallApp";
import NotificationBell from "./NotificationBell";
import type { NotificationItem } from "../data/types";
import { dismissPwaThemeUpdate, notifyPwaThemeUpdate } from "../utils/pwaThemeUpdate";

const install = vi.hoisted(() => ({ state: "installed" }));
const auth = vi.hoisted(() => ({ appearanceSaving: false }));
vi.mock("../auth/authContext", () => ({ useAuth: () => auth }));
vi.mock("../utils/pwa", () => ({
  installState: () => install.state,
  subscribeInstall: () => () => {},
  installApp: vi.fn(),
}));
vi.mock("./Popover", () => ({
  default: ({ children, trigger }: { children: React.ReactNode; trigger: React.ReactNode }) => (
    <div>
      {trigger}
      {children}
    </div>
  ),
}));

let root: Root;
let container: HTMLDivElement;
const callbacks = {
  onOpenChange: vi.fn(),
  onOpenApp: vi.fn(),
  onOpenFeed: vi.fn(),
  onMarkAllRead: vi.fn(),
  onMarkRead: vi.fn(),
  onDeleteAll: vi.fn(),
};
beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.stubGlobal("matchMedia", () => ({ matches: false }));
  dismissPwaThemeUpdate();
  install.state = "installed";
  auth.appearanceSaving = false;
  container = document.createElement("div");
  container.id = "root";
  document.body.append(container);
  root = createRoot(container);
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.clearAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});
const button = (text: string) =>
  Array.from(document.querySelectorAll("button")).find((item) => item.textContent?.includes(text))!;
function render(items: NotificationItem[] = []) {
  act(() =>
    root.render(
      <>
        <InstallApp />
        <NotificationBell
          items={items}
          unreadIds={new Set(items.map((item) => item.id))}
          arrivalAt={{}}
          loading={false}
          open
          {...callbacks}
        />
      </>,
    ),
  );
}

it("keeps theme updates in Settings without adding a bell notification", () => {
  render();
  expect(document.querySelector('[aria-label="Notifications, 1 unread"]')).toBeNull();
  act(() => notifyPwaThemeUpdate("forest-dark"));
  expect(document.querySelector('[aria-label="Notifications, 1 unread"]')).toBeNull();
  expect(container.textContent).toContain("Theme updated");
  act(() => button("How to update").click());
  expect(document.querySelector('[role="dialog"]')?.textContent).toContain("Review app update");
  expect(document.querySelector(".sheet-overlay")).not.toBeNull();
  expect(document.querySelector('[aria-label="Notifications, 1 unread"]')).toBeNull();
  act(() => button("Got it").click());
  act(() => vi.advanceTimersByTime(220));
  expect(document.querySelector('[role="dialog"]')).toBeNull();
  expect(container.textContent).not.toContain("Update app appearance");
});

it("keeps bell read/delete actions independent of the Settings theme notice", () => {
  render([
    {
      id: "feed-1",
      kind: "update",
      title: "Community update",
      body: "A new post",
      createdAt: "2026-11-17",
    },
  ]);
  act(() => notifyPwaThemeUpdate("forest-dark"));
  expect(document.querySelector('[aria-label="Notifications, 1 unread"]')).not.toBeNull();
  act(() => button("Mark all read").click());
  expect(callbacks.onMarkAllRead).toHaveBeenCalledOnce();
  act(() => button("Delete all").click());
  expect(container.textContent).toContain("Theme updated");
  expect(container.textContent).not.toContain("Update app appearance");
  expect(callbacks.onDeleteAll).toHaveBeenCalledOnce();
});

it("hides installed app updates in ordinary browser tabs", () => {
  install.state = "manual";
  render();
  act(() => notifyPwaThemeUpdate("forest-dark"));
  expect(container.textContent).not.toContain("How to update");
  expect(container.textContent).not.toContain("Update app appearance");
});

it("waits for the theme save before offering a navigation to check the latest icon", () => {
  auth.appearanceSaving = true;
  render();
  act(() => notifyPwaThemeUpdate("forest-dark"));
  act(() => button("How to update").click());
  expect(button("Saving theme").disabled).toBe(true);
  auth.appearanceSaving = false;
  render();
  expect(button("Check for app update").disabled).toBe(false);
  const reload = vi.fn();
  vi.stubGlobal("location", { reload });
  act(() => button("Check for app update").click());
  expect(reload).toHaveBeenCalledOnce();
});

it("shows Android WebAPK instructions without the desktop update menu or reload action", () => {
  vi.stubGlobal("navigator", {
    userAgent: "Mozilla/5.0 (Linux; Android 16) Chrome/144.0.0.0 Mobile Safari/537.36",
    platform: "Linux armv8l",
    maxTouchPoints: 5,
  });
  render();
  act(() => notifyPwaThemeUpdate("forest-dark"));
  act(() => button("How to update").click());
  const dialog = document.querySelector('[role="dialog"]')!;
  expect(dialog.textContent).toContain("immediate prompt is not guaranteed");
  expect(dialog.textContent).toContain("chrome://webapks");
  expect(dialog.textContent).not.toContain("Review app update");
  expect(dialog.textContent).not.toContain("Windows shortcut");
  expect(button("Check for app update")).toBeUndefined();
});
