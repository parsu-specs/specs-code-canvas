// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { dismissStartupSplash, markStartupReady, registerStartupLoading } from "./startupSplash";

let frames: Map<number, FrameRequestCallback>;
let sequence: number;

beforeEach(() => {
  vi.useFakeTimers();
  frames = new Map();
  sequence = 0;
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    frames.set(++sequence, callback);
    return sequence;
  });
  vi.stubGlobal("cancelAnimationFrame", (id: number) => frames.delete(id));
  vi.stubGlobal("matchMedia", () => ({ matches: false }));
  document.body.innerHTML =
    '<div id="app-splash" role="status"></div><div id="root" inert aria-hidden="true"></div>';
  document.getElementById("root")!.inert = true;
});

afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  document.body.innerHTML = "";
});

function paint() {
  const callbacks = [...frames.values()];
  frames.clear();
  callbacks.forEach((callback) => callback(0));
}

it("keeps one splash until both the initial route and all nested loaders are ready", () => {
  const finishAuth = registerStartupLoading();
  const finishData = registerStartupLoading();
  markStartupReady();
  finishAuth();
  paint();
  const splash = document.getElementById("app-splash")!;
  expect(splash.dataset.state).toBeUndefined();
  expect(document.getElementById("root")!.inert).toBe(true);
  finishData();
  paint();
  expect(splash.dataset.state).toBe("leaving");
  expect(document.getElementById("root")!.inert).toBe(false);
  expect(document.getElementById("root")!.hasAttribute("aria-hidden")).toBe(false);
  expect(splash.isConnected).toBe(true);
  const transition = new Event("transitionend");
  Object.assign(transition, { propertyName: "opacity" });
  splash.dispatchEvent(transition);
  expect(splash.isConnected).toBe(false);
});

it("waits for the initial route even after fonts and other loaders finish", () => {
  const finish = registerStartupLoading();
  finish();
  paint();
  expect(document.getElementById("app-splash")?.dataset.state).toBeUndefined();
  markStartupReady();
  paint();
  expect(document.getElementById("app-splash")?.dataset.state).toBe("leaving");
  vi.advanceTimersByTime(400);
  expect(document.getElementById("app-splash")).toBeNull();
});

it("cancels a premature reveal if another loader mounts or the route unmounts", () => {
  const unmountRoute = markStartupReady();
  const finish = registerStartupLoading();
  paint();
  expect(document.getElementById("app-splash")?.dataset.state).toBeUndefined();
  finish();
  unmountRoute();
  paint();
  expect(document.getElementById("app-splash")?.dataset.state).toBeUndefined();
  markStartupReady();
  paint();
  expect(document.getElementById("app-splash")?.dataset.state).toBe("leaving");
});

it("skips the fade for reduced motion and never creates another splash", () => {
  vi.stubGlobal("matchMedia", () => ({ matches: true }));
  markStartupReady();
  paint();
  expect(document.getElementById("app-splash")).toBeNull();
  const finish = registerStartupLoading();
  finish();
  markStartupReady();
  paint();
  expect(document.getElementById("app-splash")).toBeNull();
});

it("reveals error recovery even if startup still has pending work", () => {
  registerStartupLoading();
  dismissStartupSplash();
  expect(document.getElementById("app-splash")?.dataset.state).toBe("leaving");
  expect(document.getElementById("root")!.inert).toBe(false);
});
