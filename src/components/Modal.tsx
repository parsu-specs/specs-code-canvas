import { CloseButton } from "./CloseButton";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Button } from "./Button";

type ModalProps = {
  id: string;
  title: string;
  description?: string;
  onClose: () => void;
  closeDisabled?: boolean;
  closeConfirmation?: string;
  fixedHeight?: boolean;
  children: ReactNode;
};

export default function Modal({
  id,
  title,
  description,
  onClose,
  closeDisabled = false,
  closeConfirmation,
  fixedHeight = false,
  children,
}: ModalProps) {
  const labelId = useId();
  const descriptionId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const [confirmingClose, setConfirmingClose] = useState(false);
  const keepEditingRef = useRef<HTMLButtonElement>(null);
  const previousConfirmationFocus = useRef<HTMLElement | null>(null);
  const requestClose = () => {
    if (closeDisabled) return;
    if (closeConfirmation) setConfirmingClose(true);
    else onClose();
  };
  const closeRef = useRef(onClose);
  closeRef.current = () => {
    if (confirmingClose) setConfirmingClose(false);
    else requestClose();
  };

  useEffect(() => {
    if (!confirmingClose) return;
    previousConfirmationFocus.current = document.activeElement as HTMLElement | null;
    keepEditingRef.current?.focus();
    return () => {
      if (previousConfirmationFocus.current?.isConnected)
        previousConfirmationFocus.current.focus({ preventScroll: true });
    };
  }, [confirmingClose]);

  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    const appRoot = document.getElementById("root");
    const wasInert = appRoot?.inert;
    if (appRoot) appRoot.inert = true;
    document.body.style.overflow = "hidden";
    const panel = panelRef.current;
    const focusable = () =>
      Array.from(
        panel?.querySelectorAll<HTMLElement>(
          'button:not(:disabled), input:not(:disabled), textarea:not(:disabled), select:not(:disabled), a[href], [tabindex="0"]',
        ) ?? [],
      ).filter((element) => element.getClientRects().length > 0);
    (panel?.querySelector<HTMLElement>('input:not([type="file"])') ?? panel)?.focus();

    const onKey = (event: KeyboardEvent) => {
      // Portaled controls manage their own focus and Escape dismissal.
      if (
        event.defaultPrevented ||
        (event.target as Element)?.closest("[data-dropdown-portal], [data-popover-portal]")
      )
        return;
      if (event.key === "Escape") {
        event.preventDefault();
        closeRef.current();
      } else if (event.key === "Tab") {
        const items = focusable();
        const first = items[0];
        const last = items[items.length - 1];
        if (!first) {
          event.preventDefault();
          panel?.focus();
        } else if (
          event.shiftKey &&
          (document.activeElement === first || document.activeElement === panel)
        ) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
      if (appRoot) appRoot.inert = wasInert ?? false;
      if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
    };
  }, []);

  return createPortal(
    <div className="fixed inset-0 z-80 flex items-center justify-center bg-inverse/80 p-3 sm:p-6">
      <div
        ref={panelRef}
        id={id}
        role={confirmingClose ? "alertdialog" : "dialog"}
        aria-modal="true"
        aria-labelledby={labelId}
        aria-describedby={description || confirmingClose ? descriptionId : undefined}
        tabIndex={-1}
        className={`toon-card flex max-h-[90dvh] w-full max-w-3xl flex-col overflow-hidden bg-panel outline-none ${fixedHeight ? "h-[min(40rem,90dvh)]" : ""}`}
      >
        <div className="flex shrink-0 items-center justify-between gap-4 border-b-[3px] border-outline bg-primary text-primary-foreground p-4 sm:p-6">
          <div className="min-w-0">
            <h2 id={labelId} className="text-2xl font-black">
              {confirmingClose ? "Close project submission?" : title}
            </h2>
            {(description || confirmingClose) && (
              <p id={descriptionId} className="mt-1 text-sm text-primary-foreground/85">
                {confirmingClose ? closeConfirmation : description}
              </p>
            )}
          </div>
          <CloseButton
            onClick={() => (confirmingClose ? setConfirmingClose(false) : requestClose())}
            disabled={closeDisabled}
            aria-label={confirmingClose ? "Keep editing" : `Close ${title.toLowerCase()}`}
          />
        </div>
        <div
          className={`modal-grid scrollbar-minimal @container/content min-h-0 min-w-0 overscroll-contain bg-panel p-4 sm:p-6 ${fixedHeight ? "flex flex-1 flex-col overflow-hidden" : "overflow-y-auto"}`}
        >
          <div
            hidden={confirmingClose}
            className={fixedHeight && !confirmingClose ? "flex min-h-0 flex-1 flex-col" : undefined}
          >
            {children}
          </div>
          {confirmingClose && (
            <div className="flex flex-wrap justify-end gap-3">
              <Button
                ref={keepEditingRef}
                variant="surface"
                onClick={() => setConfirmingClose(false)}
              >
                Keep editing
              </Button>
              <Button variant="danger" onClick={onClose}>
                Close
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
