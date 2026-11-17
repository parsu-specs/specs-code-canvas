import { useAuth } from "../auth/authContext";
import { Button } from "./Button";
import Modal from "./Modal";
import { useSheetClose } from "./useSheetPresence";

export default function PwaThemeUpdatePrompt({ onClose }: { onClose: () => void }) {
  const { appearanceSaving } = useAuth();
  const { closing, close } = useSheetClose(onClose, false);
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
          : "Check for an app update below to reload with your current theme. Then open the app menu and choose Review app update if available. Check the preview matches your selected theme before accepting the new icon."}
      </p>
      <p className="mt-3 text-sm text-muted">
        Your browser and device control when the installed icon and launch screen update.
      </p>
      {!apple && (
        <>
          <Button
            type="button"
            className="mt-5"
            disabled={appearanceSaving}
            onClick={() => window.location.reload()}
          >
            {appearanceSaving ? "Saving theme?" : "Check for app update"}
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
