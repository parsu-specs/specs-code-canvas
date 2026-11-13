import { CloseButton } from "./CloseButton";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { CaretDown, Check } from "@phosphor-icons/react";
import { Button } from "./Button";
import { Checkbox, getInputClassName } from "./Input";

export type DropdownOption = { value: string; label: string; icon?: ReactNode };
export type DropdownProps = {
  options: DropdownOption[];
  label: string;
  placeholder?: string;
  disabled?: boolean;
  triggerVariant?: "default" | "minimal";
  /** Show beside the label from md upward; use alone at the default breakpoint. */
  mobileIcon?: ReactNode;
} & (
  | { variant?: "default" | "icons" | "check"; value: string; onChange: (value: string) => void }
  | { variant: "checkbox"; value: string[]; onChange: (value: string[]) => void }
);

/** Portals keep the styled popup clear of clipped paper cards. */
export default function Dropdown(props: DropdownProps) {
  const {
    options,
    label,
    placeholder = "Select…",
    variant = "check",
    disabled,
    triggerVariant = "default",
    mobileIcon,
  } = props;
  const id = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const portalRef = useRef<HTMLDivElement>(null);
  const [panel, setPanel] = useState<{
    top?: number;
    bottom?: number;
    left: number;
    width: number;
    maxHeight: number;
  } | null>(null);
  const open = panel !== null && !disabled;
  const selected = options.filter((option) =>
    props.variant === "checkbox"
      ? props.value.includes(option.value)
      : option.value === props.value,
  );

  function close(restoreFocus = false) {
    setPanel(null);
    if (restoreFocus) buttonRef.current?.focus();
  }

  function show() {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect || disabled) return;
    const below = window.innerHeight - rect.bottom - 16;
    const above = rect.top - 16;
    const openUp = below < 180 && above > below;
    const width = Math.min(rect.width, Math.max(0, window.innerWidth - 16));
    setPanel({
      ...(openUp ? { bottom: window.innerHeight - rect.top + 8 } : { top: rect.bottom + 8 }),
      left: Math.max(8, Math.min(rect.left, window.innerWidth - width - 8)),
      width,
      maxHeight: Math.max(0, Math.min(208, openUp ? above : below)),
    });
  }

  useEffect(() => {
    if (!open) return;
    const list = Array.from(
      portalRef.current?.querySelectorAll<HTMLElement>("[data-dropdown-list]") ?? [],
    ).find((element) => element.getClientRects().length > 0);
    const initial =
      list?.querySelector<HTMLElement>('[aria-selected="true"], input:checked') ??
      list?.querySelector<HTMLElement>("button, input");
    (initial ?? list)?.focus();
    const onPointer = (event: PointerEvent) => {
      if (
        !(
          event.target instanceof Element &&
          event.target.closest("[data-dropdown-panel]") &&
          portalRef.current?.contains(event.target)
        ) &&
        !buttonRef.current?.contains(event.target as Node)
      )
        close(true);
    };
    const onShift = (event: Event) => {
      if (
        event.type === "resize" ||
        !(event.target instanceof Node) ||
        !portalRef.current?.contains(event.target)
      ) {
        setPanel(null);
      }
    };
    document.addEventListener("pointerdown", onPointer);
    window.addEventListener("scroll", onShift, true);
    window.addEventListener("resize", onShift);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      window.removeEventListener("scroll", onShift, true);
      window.removeEventListener("resize", onShift);
    };
  }, [open]);

  function pick(value: string) {
    if (props.variant === "checkbox") {
      props.onChange(
        props.value.includes(value)
          ? props.value.filter((item) => item !== value)
          : [...props.value, value],
      );
    } else {
      props.onChange(value);
      close(true);
    }
  }

  // Both presentations share selection state; Tailwind controls which one is visible.
  function renderPopup(centered: boolean) {
    return (
      <div
        className={
          centered
            ? "fixed inset-0 z-110 flex items-center justify-center bg-inverse/80 p-4 md:hidden"
            : "hidden md:contents"
        }
      >
        <div
          data-dropdown-panel=""
          role="dialog"
          aria-modal={centered ? true : undefined}
          aria-label={label}
          id={`${id}-${centered ? "centered" : "anchored"}`}
          style={centered ? undefined : (panel ?? undefined)}
          className={
            centered
              ? "toon-card flex max-h-[85dvh] w-full max-w-sm flex-col overflow-hidden rounded-2xl bg-panel"
              : "toon-card fixed z-110 overflow-hidden rounded-2xl bg-surface"
          }
          onKeyDown={(event) => {
            if (!centered) return;
            if (event.key === "Escape") {
              event.preventDefault();
              event.stopPropagation();
              close(true);
            } else if (event.key === "Tab") {
              const items = Array.from(
                event.currentTarget.querySelectorAll<HTMLElement>(
                  "button:not(:disabled), input:not(:disabled)",
                ),
              );
              const current = items.indexOf(document.activeElement as HTMLElement);
              const next = (current + (event.shiftKey ? -1 : 1) + items.length) % items.length;
              event.preventDefault();
              items[next]?.focus();
            }
          }}
        >
          {centered && (
            <div className="flex shrink-0 items-center justify-between gap-3 border-b-2 border-outline bg-primary text-primary-foreground p-3">
              <h3 className="min-w-0 text-sm font-black">{label}</h3>
              <CloseButton
                aria-label={variant === "checkbox" ? "Done selecting" : "Close selection"}
                onClick={() => close(true)}
              />
            </div>
          )}
          <ul
            data-dropdown-list=""
            role={variant === "checkbox" ? "group" : "listbox"}
            aria-label={label}
            tabIndex={-1}
            style={centered ? undefined : { maxHeight: panel?.maxHeight }}
            className={`scrollbar-minimal min-h-0 overflow-y-auto overscroll-contain p-1.5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-secondary ${centered ? "modal-grid" : ""}`}
            onBlur={(event) => {
              if (
                !centered &&
                !event.currentTarget.parentElement?.contains(event.relatedTarget) &&
                event.relatedTarget !== buttonRef.current
              )
                close();
            }}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                event.preventDefault();
                event.stopPropagation();
                close(true);
                return;
              }
              if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
              event.preventDefault();
              const items = Array.from(
                event.currentTarget.querySelectorAll<HTMLElement>("button, input"),
              );
              const current = items.indexOf(document.activeElement as HTMLElement);
              const next =
                event.key === "Home"
                  ? 0
                  : event.key === "End"
                    ? items.length - 1
                    : Math.min(
                        items.length - 1,
                        Math.max(0, current + (event.key === "ArrowDown" ? 1 : -1)),
                      );
              items[next]?.focus();
            }}
          >
            {options.map((option) => {
              const isSelected = selected.some((item) => item.value === option.value);
              return (
                <li key={option.value} role={variant === "checkbox" ? undefined : "presentation"}>
                  {variant === "checkbox" ? (
                    <label className="flex min-h-11 min-w-0 cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-sm font-black hover:bg-background focus-within:bg-background md:min-h-0">
                      <Checkbox checked={isSelected} onChange={() => pick(option.value)} />
                      <span className="flex-1 truncate">{option.label}</span>
                    </label>
                  ) : (
                    <Button
                      variant="menu"
                      role="option"
                      aria-selected={isSelected}
                      tabIndex={-1}
                      onClick={() => pick(option.value)}
                      className={
                        "min-h-11 focus:bg-background md:min-h-0 " +
                        (isSelected ? "text-primary" : "text-foreground")
                      }
                    >
                      {variant === "icons" && option.icon && (
                        <span aria-hidden="true" className="shrink-0">
                          {option.icon}
                        </span>
                      )}
                      <span className="flex-1 truncate">{option.label}</span>
                      {variant === "check" && isSelected && (
                        <Check size={16} weight="bold" aria-hidden="true" />
                      )}
                    </Button>
                  )}
                </li>
              );
            })}
            {options.length === 0 && (
              <li
                role={variant === "checkbox" ? undefined : "presentation"}
                className="px-3 py-2 text-sm text-muted"
              >
                No options available.
              </li>
            )}
          </ul>
        </div>
      </div>
    );
  }

  return (
    <div className={"min-w-0 max-w-full " + (mobileIcon ? "w-11 md:w-full" : "w-full")}>
      <Button
        ref={buttonRef}
        variant="plain"
        disabled={disabled}
        aria-label={
          label + ": " + (selected.map((option) => option.label).join(", ") || placeholder)
        }
        title={label + ": " + (selected.map((option) => option.label).join(", ") || placeholder)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? `${id}-centered ${id}-anchored` : undefined}
        onClick={() => (open ? close() : show())}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            show();
          } else if (event.key === "Escape") close();
        }}
        className={getInputClassName(
          triggerVariant,
          "flex cursor-pointer items-center gap-2 py-2 text-left text-sm font-black " +
            (mobileIcon
              ? "h-11 justify-center px-2 md:h-auto md:justify-start " +
                (triggerVariant === "minimal" ? "md:px-3" : "md:px-4")
              : ""),
        )}
      >
        {mobileIcon && (
          <span aria-hidden="true" className="shrink-0">
            {mobileIcon}
          </span>
        )}
        {variant === "icons" && selected[0]?.icon && (
          <span aria-hidden="true" className={"shrink-0 " + (mobileIcon ? "hidden md:inline" : "")}>
            {selected[0].icon}
          </span>
        )}
        <span className={"min-w-0 flex-1 truncate " + (mobileIcon ? "hidden md:block" : "")}>
          {selected.map((option) => option.label).join(", ") || placeholder}
        </span>
        <CaretDown
          size={18}
          weight="bold"
          aria-hidden="true"
          className={
            "shrink-0 text-muted transition-transform " +
            (mobileIcon ? "hidden md:block " : "") +
            (open ? "rotate-180" : "")
          }
        />
      </Button>
      {open &&
        createPortal(
          <div ref={portalRef} data-dropdown-portal="">
            {renderPopup(true)}
            {renderPopup(false)}
          </div>,
          document.body,
        )}
    </div>
  );
}
