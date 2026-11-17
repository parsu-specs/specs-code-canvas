// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import InstallApp from "./InstallApp";
import NotificationBell from "./NotificationBell";
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
function render() {
  act(() =>
    root.render(
      <>
        <InstallApp />
        <NotificationBell
          items={[]}
          unreadIds={new Set()}
          arrivalAt={{}}
          loading={false}
          open
          {...callbacks}
        />
      </>,
    ),
  );
}

it("shares the theme update between Settings and the bell, and marks it read from Settings", () => {
  render();
  expect(document.querySelector('[aria-label="Notifications, 1 unread"]')).toBeNull();
  act(() => notifyPwaThemeUpdate("forest-dark"));
  expect(document.querySelector('[aria-label="Notifications, 1 unread"]')).not.toBeNull();
  expect(container.textContent).toContain("Theme updated");
  act(() => button("How to update").click());
  expect(document.querySelector('[role="dialog"]')?.textContent).toContain("Review app update");
  expect(document.querySelector(".sheet-overlay")).not.toBeNull();
  expect(document.querySelector('[aria-label="Notifications, 1 unread"]')).toBeNull();
  act(() => button("Got it").click());
  act(() => vi.advanceTimersByTime(220));
  expect(document.querySelector('[role="dialog"]')).toBeNull();
  expect(container.textContent).toContain("Update app appearance");
});

it("opens instructions from the bell without navigating to a feed or project", () => {
  render();
  act(() => notifyPwaThemeUpdate("forest-dark"));
  act(() => button("Update app appearance").click());
  expect(document.querySelector('[role="dialog"]')).not.toBeNull();
  expect(callbacks.onOpenChange).toHaveBeenCalledWith(false);
  expect(callbacks.onOpenFeed).not.toHaveBeenCalled();
  expect(callbacks.onOpenApp).not.toHaveBeenCalled();
});

it("supports mark-all-read and delete-all for the app update", () => {
  render();
  act(() => notifyPwaThemeUpdate("forest-dark"));
  act(() => button("Mark all read").click());
  expect(document.querySelector('[aria-label="Notifications, 1 unread"]')).toBeNull();
  expect(callbacks.onMarkAllRead).toHaveBeenCalledOnce();
  act(() => button("Delete all").click());
  expect(container.textContent).not.toContain("Theme updated");
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
