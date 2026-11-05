// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Main from "./Main";
import { useAuth } from "../auth/authContext";
import { consumeSharedDestination } from "../utils/sharedDestination";
import { setActiveViewer } from "../utils/viewerCache";
import { preloadCatalog } from "../utils/loadCatalog";

vi.mock("../auth/authContext", () => ({ useAuth: vi.fn() }));
vi.mock("./Login", () => ({ default: () => <div>Sign in</div> }));
vi.mock("./Store", () => ({ default: () => <div>Store</div> }));
vi.mock("./PublicSite", () => ({ default: () => <div>Home</div> }));
vi.mock("../utils/loadCatalog", () => ({ preloadCatalog: vi.fn() }));
let container: HTMLDivElement;
let root: Root;
beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  consumeSharedDestination();
  sessionStorage.clear();
  localStorage.clear();
  vi.mocked(preloadCatalog).mockClear();
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});

describe("opening shared links", () => {
  it("uses a cached viewer only for the loading shell until the session is restored", async () => {
    window.history.replaceState({}, "", "/discover");
    setActiveViewer("viewer");
    vi.mocked(useAuth).mockReturnValue({ user: null, loading: true } as ReturnType<typeof useAuth>);
    await act(async () => root.render(<Main />));
    expect(container.querySelector("[data-loading-placeholder]")).not.toBeNull();
    expect(container.querySelector("[data-loading-placeholder]")?.getAttribute("role")).toBeNull();
    expect(container.textContent).not.toContain("Store");
    vi.mocked(useAuth).mockReturnValue({ user: null, loading: false } as ReturnType<
      typeof useAuth
    >);
    await act(async () => root.render(<Main />));
    expect(window.location.pathname).toBe("/signin");
    expect(container.textContent).toContain("Sign in");
    expect(container.textContent).not.toContain("Store");
  });

  it.each([false, true])(
    "warms a verified viewer's catalog with fontsReady=%s",
    async (fontsReady) => {
      window.history.replaceState({}, "", "/discover");
      vi.mocked(useAuth).mockReturnValue({
        user: { id: "viewer", name: "Viewer", email: "viewer@example.com" },
        loading: false,
      } as ReturnType<typeof useAuth>);
      await act(async () => root.render(<Main fontsReady={fontsReady} />));
      expect(preloadCatalog).toHaveBeenCalledWith(expect.any(Object), "viewer");
      if (!fontsReady) expect(container.textContent).not.toContain("Store");
      await act(async () => root.render(<Main fontsReady />));
      expect(container.textContent).toContain("Store");
      expect(preloadCatalog).toHaveBeenCalledTimes(1);
      for (const path of ["/settings", "/discover"]) {
        await act(async () => {
          window.history.pushState({}, "", path);
          window.dispatchEvent(new PopStateEvent("popstate"));
        });
      }
      expect(preloadCatalog).toHaveBeenCalledTimes(1);
    },
  );

  it("does not prefetch a protected catalog using only a cached viewer hint", async () => {
    window.history.replaceState({}, "", "/discover");
    setActiveViewer("viewer");
    vi.mocked(useAuth).mockReturnValue({ user: null, loading: true } as ReturnType<typeof useAuth>);
    await act(async () => root.render(<Main fontsReady={false} />));
    expect(preloadCatalog).not.toHaveBeenCalled();
  });

  it.each(["/apps/project-1", "/developers/alex"])("returns to %s after sign-in", async (path) => {
    window.history.replaceState({}, "", path);
    vi.mocked(useAuth).mockReturnValue({ user: null, loading: false } as ReturnType<
      typeof useAuth
    >);
    await act(async () => root.render(<Main />));
    expect(window.location.pathname).toBe("/signin");
    // Password and Google sign-in currently replace the URL with Discover.
    window.history.replaceState({}, "", "/discover");
    vi.mocked(useAuth).mockReturnValue({
      user: { id: "viewer", name: "Viewer", email: "viewer@example.com" },
      loading: false,
    } as ReturnType<typeof useAuth>);
    await act(async () => root.render(<Main />));
    expect(window.location.pathname).toBe(path);
    expect(consumeSharedDestination()).toBeNull();
  });
});
