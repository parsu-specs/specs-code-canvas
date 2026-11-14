// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, it, vi } from "vitest";

// The repo .env configures Turnstile/Google/Supabase. Stub them BEFORE the
// Login module evaluates its module-level consts so the form renders in the
// plain local mode these tests exercise.
vi.stubEnv("VITE_TURNSTILE_SITE_KEY", "");
vi.stubEnv("VITE_GOOGLE_CLIENT_ID", "");
vi.stubEnv("VITE_DATA_SOURCE", "local");

const { default: Login } = await import("./Login");
const { ROUTES } = await import("./routes");

const signup = vi.hoisted(() => vi.fn());
const lookup = vi.hoisted(() => vi.fn());
vi.mock("../auth/authContext", () => ({
  useAuth: () => ({
    signin: vi.fn(),
    signup,
    signinWithGoogleAccount: vi.fn(),
  }),
}));
vi.mock("../data/factory", () => ({
  getAuthRepo: () => ({}),
  getProfileRepo: () => ({ getProfileByName: lookup }),
}));

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

let cleanup = () => {};
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.useRealTimers();
  window.history.replaceState({}, "", ROUTES.signin);
});

function setInput(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
  act(() => {
    setter.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

function renderLogin() {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  cleanup = () => {
    act(() => root.unmount());
    container.remove();
  };
  act(() => root.render(createElement(Login)));
  // Switch to the "Create account" tab.
  const tabs = Array.from(container.querySelectorAll('button[role="tab"]')) as HTMLElement[];
  act(() => {
    tabs.find((b) => b.textContent === "Create account")!.click();
  });
  const name = container.querySelector('input[autocomplete="username"]') as HTMLInputElement;
  const fullName = container.querySelector('input[autocomplete="name"]') as HTMLInputElement;
  setInput(fullName, "Alex Reyes");
  const email = container.querySelector('input[type="email"]') as HTMLInputElement;
  const password = container.querySelector('input[type="password"]') as HTMLInputElement;
  const submit = () => container.querySelector('button[type="submit"]') as HTMLButtonElement;
  return { container, name, email, password, submit };
}

it("flags a taken username and blocks account creation", async () => {
  vi.useFakeTimers();
  const { container, name, email, password, submit } = renderLogin();
  lookup.mockResolvedValueOnce({ id: "someone-else" });
  setInput(name, "mia-santos");
  await act(async () => {
    await vi.advanceTimersByTimeAsync(400);
  });
  // The live flag from the availability checker is visible.
  expect(container.textContent).toContain("That username is already taken.");
  setInput(email, "newbie@example.com");
  setInput(password, "secret123");
  expect(submit().disabled).toBe(true);
  expect(signup).not.toHaveBeenCalled();
});

it("uses password-manager hints appropriate to sign-in and account creation", () => {
  const { container } = renderLogin();
  expect(container.querySelector('input[type="email"]')?.getAttribute("autocomplete")).toBe(
    "email",
  );
  expect(container.querySelector('input[type="password"]')?.getAttribute("autocomplete")).toBe(
    "new-password",
  );
  act(() => {
    Array.from(container.querySelectorAll('button[role="tab"]'))
      .find((button) => button.textContent === "Sign in")!
      .dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
  expect(container.querySelector('input[type="password"]')?.getAttribute("autocomplete")).toBe(
    "current-password",
  );
  expect(container.querySelector('input[autocomplete="name"]')).toBeNull();
  expect(container.querySelector("h1")?.textContent).toBe("Welcome back");
});

it("reports the wait when submitting while the name check is still running", async () => {
  vi.useFakeTimers();
  const { container, name, email, password } = renderLogin();
  let resolveLookup!: (value: unknown) => void;
  lookup.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        resolveLookup = resolve;
      }),
  );
  setInput(name, "mia-santos");
  setInput(email, "newbie@example.com");
  setInput(password, "secret123");
  // Still "checking": submitting through the form reports the wait.
  const form = container.querySelector("form")!;
  await act(async () => {
    form.dispatchEvent(new window.Event("submit", { bubbles: true, cancelable: true }));
  });
  expect(container.textContent).toContain("Checking username availability");
  expect(signup).not.toHaveBeenCalled();
  await act(async () => {
    await vi.advanceTimersByTimeAsync(400);
    resolveLookup({ id: "someone-else" });
  });
  expect(container.textContent).toContain("already taken");
  expect(signup).not.toHaveBeenCalled();
});

it("creates the account once a fresh username is available", async () => {
  vi.useFakeTimers();
  const { name, email, password, submit } = renderLogin();
  lookup.mockResolvedValueOnce(null);
  setInput(name, "fresh-name");
  await act(async () => {
    await vi.advanceTimersByTimeAsync(400);
  });
  setInput(email, "fresh@example.com");
  setInput(password, "secret123");
  signup.mockResolvedValueOnce(null);
  await act(async () => {
    submit().click();
  });
  expect(signup).toHaveBeenCalledExactlyOnceWith(
    "fresh-name",
    "fresh@example.com",
    "secret123",
    undefined,
    "Alex Reyes",
  );
});
