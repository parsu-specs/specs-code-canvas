// @vitest-environment jsdom
import { beforeEach, expect, it, vi } from "vitest";

beforeEach(() => {
  vi.resetModules();
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({ matches: false, addEventListener: vi.fn() })),
  );
});

it("retains the browser prompt until a user action, then consumes it once", async () => {
  const { initializePwa, installState, installApp, subscribeInstall } = await import("./pwa");
  initializePwa();
  const changed = vi.fn();
  const unsubscribe = subscribeInstall(changed);
  const event = new Event("beforeinstallprompt", { cancelable: true });
  const prompt = vi.fn().mockResolvedValue(undefined);
  Object.assign(event, { prompt, userChoice: Promise.resolve({ outcome: "dismissed" }) });
  window.dispatchEvent(event);
  expect(event.defaultPrevented).toBe(true);
  expect(installState()).toBe("available");
  expect(prompt).not.toHaveBeenCalled();
  await installApp();
  expect(prompt).toHaveBeenCalledOnce();
  expect(installState()).toBe("manual");
  await installApp();
  expect(prompt).toHaveBeenCalledOnce();
  expect(changed).toHaveBeenCalled();
  window.dispatchEvent(new Event("appinstalled"));
  expect(installState()).toBe("installed");
  unsubscribe();
});

it("recognizes installed standalone windows", async () => {
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({ matches: true })),
  );
  const { installState } = await import("./pwa");
  expect(installState()).toBe("installed");
});
