import { useEffect, useRef, useState } from "react";

export const SHEET_EXIT_MS = 220;

/** Keep the last dialog content mounted while its sheet slides out. */
export function useSheetPresence<T>(value: T | null | false | undefined) {
  const [retained, setRetained] = useState<T | null>(value || null);
  useEffect(() => {
    if (value) {
      setRetained(value);
      return;
    }
    if (!retained) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      setRetained(null);
      return;
    }
    const timer = setTimeout(() => setRetained(null), SHEET_EXIT_MS);
    return () => clearTimeout(timer);
  }, [value, retained]);
  return { value: value || retained, present: Boolean(value || retained), closing: !value };
}

/** Shared Modal callers unmount on close, so defer that callback until the exit ends. */
export function useSheetClose(onClose: () => void, managedExternally = false) {
  const [closing, setClosing] = useState(false);
  const callback = useRef(onClose);
  callback.current = onClose;
  useEffect(() => {
    if (!closing) return;
    const timer = setTimeout(() => callback.current(), SHEET_EXIT_MS);
    return () => clearTimeout(timer);
  }, [closing]);
  return {
    closing,
    close: () => {
      if (managedExternally || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches)
        callback.current();
      else setClosing(true);
    },
  };
}
