export interface InstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

let installPrompt: InstallPromptEvent | null = null;
let installedThisSession = false;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((listener) => listener());

export function initializePwa() {
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    installPrompt = event as InstallPromptEvent;
    notify();
  });
  window.addEventListener("appinstalled", () => {
    installedThisSession = true;
    installPrompt = null;
    notify();
  });
  window.matchMedia("(display-mode: standalone)").addEventListener("change", notify);
  if (import.meta.env.PROD && "serviceWorker" in navigator && window.isSecureContext) {
    const register = () => {
      void navigator.serviceWorker
        .register("/font-cache-worker.js", { updateViaCache: "none" })
        .catch((error) => console.warn("Could not register the CodeCanvas service worker", error));
    };
    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });
  }
}

export function subscribeInstall(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function installState() {
  if (
    installedThisSession ||
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone
  )
    return "installed";
  return installPrompt ? "available" : "manual";
}

export async function installApp() {
  const event = installPrompt;
  if (!event) return;
  installPrompt = null;
  notify();
  await event.prompt();
  await event.userChoice;
}
