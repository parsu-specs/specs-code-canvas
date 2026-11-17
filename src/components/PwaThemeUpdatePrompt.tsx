import { useAuth } from "../auth/authContext";
import { Button } from "./Button";
import Modal from "./Modal";
import { useSheetClose } from "./useSheetPresence";

export default function PwaThemeUpdatePrompt({ onClose }: { onClose: () => void }) {
  const { appearanceSaving } = useAuth();
  const { closing, close } = useSheetClose(onClose, false);
  const android = /Android/.test(navigator.userAgent);
  const edgeOnWindows = /Edg\//.test(navigator.userAgent) && /Windows/.test(navigator.userAgent);
  const apple =
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

  return (
    <Modal
      id="pwa-theme-update"
      title="Update app appearance"
      description="Your new theme is already active inside CodeCanvas."
      onClose={close}
      exiting={closing}
    >
      <p className="text-sm font-bold">
        {apple
          ? "Close and reopen CodeCanvas to refresh its launch appearance. If the home screen icon keeps its old colors, your device may require removing and adding the app to the home screen again."
          : android
            ? "Android updates the installed icon and launch screen separately through Chrome. Launch CodeCanvas from its installed icon after changing the theme, then close it and leave the phone charging on Wi-Fi. The update may be delayed, and an immediate prompt is not guaranteed."
            : "Check for an app update below to reload with your current theme. Then open the app menu and choose Review app update if available. Check the preview matches your selected theme before accepting the new icon."}
      </p>
      {android && (
        <details className="mt-4 rounded-xl border-2 border-divider p-3 text-sm">
          <summary className="cursor-pointer font-black">Test the Android icon update</summary>
          <ol className="mt-3 list-decimal space-y-2 pl-5">
            <li>Connect to Wi-Fi and plug in the phone.</li>
            <li>Close CodeCanvas, then force stop CodeCanvas from Android Settings &gt; Apps.</li>
            <li>
              Open Chrome and type <strong>chrome://webapks</strong> in the address bar. Find
              CodeCanvas and tap Update if available. Its status should become Pending.
            </li>
            <li>Launch CodeCanvas from its installed icon, then close and force stop it again.</li>
            <li>Wait a few minutes and check whether the status becomes Successful.</li>
          </ol>
          <p className="mt-3 text-muted">
            If CodeCanvas is not listed, it may be a home screen shortcut rather than a WebAPK.
          </p>
        </details>
      )}
      {edgeOnWindows && (
        <div className="mt-4 rounded-xl border-2 border-divider p-3 text-sm">
          <p className="font-black">Preview correct, but Windows icon still old?</p>
          <p className="mt-1">
            After accepting the update, close every CodeCanvas window and reopen it. If the taskbar
            or Start icon still shows the previous theme, unpin CodeCanvas, open it from
            edge://apps, then pin it again. Changing themes again is not needed.
          </p>
        </div>
      )}
      <p className="mt-3 text-sm text-muted">
        Your browser and device control when the installed icon and launch screen update.
        {edgeOnWindows && " CodeCanvas cannot refresh Windows shortcut icons directly."}
      </p>
      {!apple && !android && (
        <>
          <Button
            type="button"
            className="mt-5"
            disabled={appearanceSaving}
            onClick={() => window.location.reload()}
          >
            {appearanceSaving ? "Saving theme..." : "Check for app update"}
          </Button>
          <p className="mt-2 text-xs text-muted">
            Reloads CodeCanvas so your browser can check the latest theme. Save unfinished edits
            first.
          </p>
        </>
      )}
      <Button type="button" variant="surface" className="mt-5" onClick={close}>
        Got it
      </Button>
    </Modal>
  );
}
