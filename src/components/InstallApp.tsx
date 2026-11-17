import { useState, useSyncExternalStore } from "react";
import { DownloadSimple } from "@phosphor-icons/react";
import { Button } from "./Button";
import PwaThemeUpdatePrompt from "./PwaThemeUpdatePrompt";
import {
  markPwaThemeUpdateRead,
  pwaThemeUpdateSnapshot,
  subscribePwaThemeUpdate,
} from "../utils/pwaThemeUpdate";
import { installApp, installState, subscribeInstall } from "../utils/pwa";

export default function InstallApp() {
  const state = useSyncExternalStore(subscribeInstall, installState, () => "manual");
  const update = useSyncExternalStore(subscribePwaThemeUpdate, pwaThemeUpdateSnapshot, () => null);
  const [showUpdate, setShowUpdate] = useState(false);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  const apple =
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  return (
    <section className="toon-card toon-paper bg-panel p-6 pt-10 sm:p-8 sm:pt-12">
      <div className="flex items-center gap-2">
        <DownloadSimple size={22} weight="duotone" aria-hidden="true" />
        <h2 className="text-2xl font-black">Install CodeCanvas</h2>
      </div>
      <p className="mt-2 text-sm font-bold text-muted">
        {state === "installed"
          ? "CodeCanvas is running as an installed app."
          : "Keep CodeCanvas on your home screen or desktop and open it in its own window."}
      </p>
      {state === "installed" && (
        <div className="mt-4 border-t-2 border-dashed border-divider/60 pt-4">
          <p className="font-black">{update ? "Theme updated" : "App appearance"}</p>
          <p className="mt-1 text-sm font-bold text-muted">
            {update
              ? "Your new theme is active. Update the installed app icon and launch appearance to match."
              : "See how to refresh the installed app icon and launch appearance after changing themes."}
          </p>
          <Button
            type="button"
            size="small"
            className="mt-3"
            onClick={() => {
              markPwaThemeUpdateRead();
              setShowUpdate(true);
            }}
          >
            How to update
          </Button>
        </div>
      )}
      {showUpdate && <PwaThemeUpdatePrompt onClose={() => setShowUpdate(false)} />}
      {state === "available" ? (
        <Button
          type="button"
          className="mt-4"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            setError(false);
            try {
              await installApp();
            } catch {
              setError(true);
            } finally {
              setBusy(false);
            }
          }}
        >
          Install app
        </Button>
      ) : state === "manual" ? (
        <p className="mt-3 text-sm font-bold">
          {apple
            ? "Open this site in Safari, tap Share, then Add to Home Screen. Keep Open as Web App enabled if shown."
            : "Open your browser menu and choose Install CodeCanvas or Add to Home Screen. If that option is unavailable, try Chrome or Edge."}
        </p>
      ) : null}
      {error && (
        <p role="alert" className="mt-3 text-sm font-bold">
          Installation could not start. Use your browser menu to install the app.
        </p>
      )}
    </section>
  );
}
