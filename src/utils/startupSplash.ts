type SplashState = {
  pending: Set<symbol>;
  ready: Set<symbol>;
  frame?: number;
};
const states = new WeakMap<HTMLElement, SplashState>();

function currentSplash() {
  const element = document.getElementById("app-splash");
  if (!element || element.dataset.state === "leaving") return;
  let state = states.get(element);
  if (!state) {
    state = { pending: new Set(), ready: new Set() };
    states.set(element, state);
  }
  return { element, state };
}

function revealPage(element: HTMLElement) {
  const root = document.getElementById("root");
  if (root) {
    root.inert = false;
    root.removeAttribute("aria-hidden");
  }
  element.setAttribute("aria-hidden", "true");
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
    element.remove();
    return;
  }
  element.dataset.state = "leaving";
  const remove = () => {
    window.clearTimeout(timer);
    element.removeEventListener("transitionend", onTransitionEnd);
    element.remove();
  };
  const onTransitionEnd = (event: TransitionEvent) => {
    if (event.target === element && event.propertyName === "opacity") remove();
  };
  const timer = window.setTimeout(remove, 400);
  element.addEventListener("transitionend", onTransitionEnd);
}

function scheduleReveal(element: HTMLElement, state: SplashState) {
  if (state.frame !== undefined) window.cancelAnimationFrame(state.frame);
  if (!state.ready.size || state.pending.size || element.dataset.state === "leaving") return;
  // Check after this commit's effects, including new nested loaders and StrictMode remounts.
  state.frame = window.requestAnimationFrame(() => {
    state.frame = undefined;
    if (state.ready.size && !state.pending.size && element.isConnected) revealPage(element);
  });
}

/** The initial route has committed after auth, fonts, and its lazy module are ready. */
export function markStartupReady() {
  const splash = currentSplash();
  if (!splash) return () => {};
  const { element, state } = splash;
  const token = Symbol();
  state.ready.add(token);
  scheduleReveal(element, state);
  return () => {
    state.ready.delete(token);
    scheduleReveal(element, state);
  };
}

/** Existing page/data loaders keep the single splash until the initial content is ready. */
export function registerStartupLoading() {
  const splash = currentSplash();
  if (!splash) return () => {};
  const { element, state } = splash;
  const token = Symbol();
  state.pending.add(token);
  scheduleReveal(element, state);
  return () => {
    state.pending.delete(token);
    scheduleReveal(element, state);
  };
}

/** Reveal recovery controls immediately if startup fails, even with loaders still pending. */
export function dismissStartupSplash() {
  const splash = currentSplash();
  if (!splash) return;
  if (splash.state.frame !== undefined) window.cancelAnimationFrame(splash.state.frame);
  revealPage(splash.element);
}
