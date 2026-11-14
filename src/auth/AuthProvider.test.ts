// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { expect, it, vi } from "vitest";
import { AuthProvider } from "./AuthProvider";
import { useAuth } from "./authContext";
import type { User } from "../data/types";
import { NotFoundError } from "../data/repositories";

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  subscribeSession: vi.fn(),
  ensureUserProfile: vi.fn(),
  getProfile: vi.fn(),
  getProfileByName: vi.fn(),
  updateName: vi.fn(),
  unsubscribe: vi.fn(),
}));
vi.mock("../data/factory", () => ({
  getAuthRepo: () => mocks,
  getProfileRepo: () => mocks,
}));

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

it("follows session changes, preserves profile on token refresh, and ignores stale restoration", async () => {
  let restore!: (user: User | null) => void;
  let notify!: (user: User | null) => void;
  mocks.getSession.mockReturnValue(new Promise((resolve) => (restore = resolve)));
  mocks.subscribeSession.mockImplementation((callback) => {
    notify = callback;
    return mocks.unsubscribe;
  });
  const user = { id: "u1", email: "member@example.com", name: "Member" };
  mocks.ensureUserProfile.mockResolvedValue({ ...user, role: "Builder", bio: "", color: "sky" });
  let auth!: ReturnType<typeof useAuth>;
  function Probe() {
    auth = useAuth();
    return null;
  }
  const container = document.createElement("div");
  const root = createRoot(container);
  try {
    await act(async () => root.render(createElement(AuthProvider, null, createElement(Probe))));
    await act(async () => notify(user));
    expect(auth.user).toEqual(user);
    expect(auth.loading).toBe(false);
    const profile = auth.profile;
    expect(profile?.role).toBe("Builder");

    await act(async () => notify({ ...user }));
    expect(auth.profile).toBe(profile);
    expect(mocks.ensureUserProfile).toHaveBeenCalledTimes(1);

    await act(async () => notify(null));
    expect(auth.user).toBeNull();
    expect(auth.profile).toBeNull();
    await act(async () => restore(user));
    expect(auth.user).toBeNull();
  } finally {
    await act(async () => root.unmount());
    localStorage.clear();
  }
  expect(mocks.unsubscribe).toHaveBeenCalledOnce();
});

it("requires new Google accounts to submit both fields before showing the app", async () => {
  vi.clearAllMocks();
  localStorage.clear();
  const user = {
    id: "google-new",
    name: "Alex Reyes",
    fullName: "Alex Reyes",
    email: "alex@example.com",
    requiresProfileSetup: true,
  };
  mocks.getSession.mockResolvedValue(user);
  mocks.subscribeSession.mockReturnValue(() => {});
  mocks.getProfile.mockRejectedValue(new NotFoundError());
  mocks.getProfileByName.mockResolvedValueOnce({ id: "taken" }).mockResolvedValue(null);
  mocks.ensureUserProfile.mockResolvedValue({
    id: user.id,
    name: "alex_reyes",
    fullName: "Alex Reyes",
    role: "Guest",
    bio: "",
    color: "sky",
  });
  mocks.updateName.mockResolvedValue({ ...user, name: "alex_reyes", requiresProfileSetup: false });
  const container = document.createElement("div");
  document.body.append(container);
  container.id = "root";
  container.inert = true;
  container.setAttribute("aria-hidden", "true");
  const splash = document.createElement("div");
  splash.id = "app-splash";
  document.body.prepend(splash);
  const frames = new Map<number, FrameRequestCallback>();
  let sequence = 0;
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    frames.set(++sequence, callback);
    return sequence;
  });
  vi.stubGlobal("cancelAnimationFrame", (id: number) => frames.delete(id));
  vi.stubGlobal("matchMedia", () => ({ matches: true }));
  const root = createRoot(container);
  try {
    await act(async () =>
      root.render(createElement(AuthProvider, null, createElement("p", null, "App content"))),
    );
    expect(container.textContent).toContain("Complete your profile");
    // OAuth redirects start under the app splash; onboarding must reveal itself.
    frames.forEach((callback) => callback(0));
    expect(document.getElementById("app-splash")).toBeNull();
    expect(container.inert).toBe(false);
    expect(container.hasAttribute("aria-hidden")).toBe(false);
    expect(container.textContent).toContain("Google connected");
    expect(container.textContent).toContain(user.email);
    expect(container.textContent).not.toContain("App content");
    expect(mocks.ensureUserProfile).not.toHaveBeenCalled();
    expect((container.querySelector('input[autocomplete="name"]') as HTMLInputElement).value).toBe(
      "Alex Reyes",
    );
    const username = container.querySelector('input[autocomplete="username"]') as HTMLInputElement;
    expect(username.value).toBe("");
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
    await act(async () => {
      setter.call(username, "already-taken");
      username.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 450));
    });
    expect(container.textContent).toContain("That username is already taken.");
    expect((container.querySelector('button[type="submit"]') as HTMLButtonElement).disabled).toBe(
      true,
    );
    expect(mocks.ensureUserProfile).not.toHaveBeenCalled();
    await act(async () => {
      setter.call(username, "alex_reyes");
      username.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 450));
    });
    await act(async () => {
      container
        .querySelector('button[type="submit"]')!
        .dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(mocks.ensureUserProfile).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "alex_reyes",
        fullName: "Alex Reyes",
        requiresProfileSetup: false,
      }),
    );
    expect(container.textContent).toContain("App content");
    expect(container.textContent).not.toContain("Complete your profile");
  } finally {
    await act(async () => root.unmount());
    container.remove();
    splash.remove();
    vi.unstubAllGlobals();
    localStorage.clear();
  }
});

it("skips setup for a returning Google account with an existing profile", async () => {
  vi.clearAllMocks();
  localStorage.clear();
  const user = {
    id: "google-existing",
    name: "Alex Reyes",
    email: "alex@example.com",
    requiresProfileSetup: true,
  };
  const profile = {
    id: user.id,
    name: "alex",
    fullName: "Alex Reyes",
    role: "Guest",
    bio: "",
    color: "sky",
  };
  mocks.getSession.mockResolvedValue(user);
  mocks.subscribeSession.mockReturnValue(() => {});
  mocks.getProfile.mockResolvedValue(profile);
  mocks.ensureUserProfile.mockResolvedValue(profile);
  const container = document.createElement("div");
  const root = createRoot(container);
  try {
    await act(async () =>
      root.render(createElement(AuthProvider, null, createElement("p", null, "App content"))),
    );
    expect(container.textContent).toContain("App content");
    expect(container.textContent).not.toContain("Complete your profile");
  } finally {
    await act(async () => root.unmount());
    localStorage.clear();
  }
});
