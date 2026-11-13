import { userFacingError } from "../utils/userFacingError";
import { CloseButton } from "./CloseButton";
import { useRef } from "react";
import { createPortal } from "react-dom";

export default function ErrorNotice({
  message,
  onDismiss,
}: {
  message: string;
  onDismiss: () => void;
}) {
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  return createPortal(
    <div className="pointer-events-none fixed inset-x-0 top-[calc(1rem+env(safe-area-inset-top,0px))] z-120 flex justify-center px-4 lg:inset-x-auto lg:top-auto lg:bottom-6 lg:right-6 lg:p-0">
      <div
        role="alert"
        className="toon-card pointer-events-auto flex w-full max-w-md items-center gap-3 bg-surface px-5 py-3 text-sm font-black"
        onTouchStart={(event) => {
          const touch = event.touches[0];
          touchStart.current = { x: touch.clientX, y: touch.clientY };
        }}
        onTouchEnd={(event) => {
          const start = touchStart.current;
          touchStart.current = null;
          if (!start || window.matchMedia("(min-width: 1024px)").matches) return;
          const touch = event.changedTouches[0];
          if (Math.hypot(touch.clientX - start.x, touch.clientY - start.y) >= 50) {
            onDismiss();
          }
        }}
        onTouchCancel={() => {
          touchStart.current = null;
        }}
      >
        <p className="min-w-0 flex-1">{userFacingError(message)}</p>
        <CloseButton type="button" aria-label="Dismiss notification" onClick={onDismiss} />
      </div>
    </div>,
    document.body,
  );
}
