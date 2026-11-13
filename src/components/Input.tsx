import {
  forwardRef,
  useId,
  useState,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
  type InputHTMLAttributes,
} from "react";

export type InputVariant = "default" | "search" | "flat" | "ghost" | "minimal";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  variant?: InputVariant;
};

const baseClassName =
  "min-w-0 max-w-full w-full rounded-2xl border-[3px] px-4 py-3 outline-none transition-[border-color] duration-150";

const variantClassName: Record<InputVariant, string> = {
  default:
    "border-outline bg-surface shadow-[4px_4px_0_var(--color-outline)] hover:border-primary focus:border-primary active:border-primary",
  search:
    "border-outline bg-surface py-4 pl-14 shadow-[4px_4px_0_var(--color-outline)] hover:border-primary focus:border-primary active:border-primary",
  flat: "border-outline bg-surface shadow-none hover:border-primary focus:border-primary active:border-primary",
  ghost:
    "border-transparent bg-transparent shadow-none hover:border-transparent focus:border-primary active:border-primary",
  minimal:
    "rounded-xl border-0 bg-transparent px-3 py-2 text-sm shadow-none hover:bg-background focus-visible:ring-4 focus-visible:ring-secondary disabled:cursor-not-allowed disabled:opacity-60",
};

export function getInputClassName(variant: InputVariant = "default", className?: string): string {
  return [
    variant === "minimal"
      ? "min-w-0 max-w-full w-full outline-none transition-colors duration-150"
      : baseClassName,
    variantClassName[variant],
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ variant = "default", className, ...props }, ref) => (
    <input {...props} ref={ref} className={getInputClassName(variant, className)} />
  ),
);

Input.displayName = "Input";

export default Input;

/** Native form controls share Input's theme, focus, and sizing rules. */
type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  variant?: InputVariant;
};

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ variant = "default", className, ...props }, ref) => (
    <select {...props} ref={ref} className={getInputClassName(variant, className)} />
  ),
);
Select.displayName = "Select";

export type TextareaProps = Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "children"> & {
  /** Fixed sizing lets specialized editors manage their measured height. */
  sizing?: "content" | "fixed";
  /** Show the current character count against maxLength when a limit is provided. */
  showCharacterCount?: boolean;
  /** Bottom actions inside the field frame; a render function can position the counter. */
  children?: ReactNode | ((characterCount: ReactNode) => ReactNode);
};

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      className,
      sizing = "content",
      children,
      showCharacterCount = false,
      value,
      defaultValue,
      maxLength,
      onChange,
      ...props
    },
    ref,
  ) => {
    const counterId = useId();
    const [uncontrolledLength, setUncontrolledLength] = useState(
      () => String(defaultValue ?? "").length,
    );
    const characterCount = value == null ? uncontrolledLength : String(value).length;
    const showCounter = showCharacterCount && maxLength != null && maxLength >= 0;
    const hasFooter = children != null;
    const counter = showCounter ? (
      <span id={counterId} className="text-xs text-muted tabular-nums">
        {characterCount} / {maxLength} <span className="hidden md:inline">characters</span>
      </span>
    ) : null;
    const textarea = (
      <textarea
        {...props}
        ref={ref}
        value={value}
        defaultValue={defaultValue}
        maxLength={maxLength}
        aria-describedby={
          [props["aria-describedby"], showCounter ? counterId : undefined]
            .filter(Boolean)
            .join(" ") || undefined
        }
        onChange={(event) => {
          if (value == null) setUncontrolledLength(event.currentTarget.value.length);
          onChange?.(event);
        }}
        className={[
          hasFooter
            ? "block min-w-0 w-full max-w-full border-0 bg-transparent p-0 outline-none"
            : getInputClassName(),
          "block min-h-24 max-h-[min(60vh,32rem)] supports-[height:100dvh]:max-h-[min(60dvh,32rem)] overflow-y-auto",
          sizing === "fixed"
            ? "field-sizing-fixed resize-none"
            : "field-sizing-content resize-y supports-[field-sizing:content]:resize-none",
          className ?? "",
        ].join(" ")}
      />
    );

    if (hasFooter) {
      return (
        <div className={getInputClassName("default", "block focus-within:border-primary")}>
          {textarea}
          <div className="flex min-w-0 flex-wrap items-center justify-end gap-3 pt-3">
            {typeof children === "function" ? (
              children(counter)
            ) : (
              <>
                {counter}
                {children}
              </>
            )}
          </div>
        </div>
      );
    }

    if (!showCounter) return textarea;

    return (
      <span className="block min-w-0 w-full">
        {textarea}
        <span className="mt-2 block text-right">{counter}</span>
      </span>
    );
  },
);
Textarea.displayName = "Textarea";

type NativeChoiceProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type">;

export const Checkbox = forwardRef<HTMLInputElement, NativeChoiceProps>(
  ({ className = "", ...props }, ref) => (
    <input
      {...props}
      ref={ref}
      type="checkbox"
      className={`h-4 w-4 shrink-0 accent-primary focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-secondary disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
    />
  ),
);
Checkbox.displayName = "Checkbox";

/** Pair with ButtonLabel so keyboard focus is visible on the upload action. */
export const FileInput = forwardRef<HTMLInputElement, NativeChoiceProps>(
  ({ className = "", ...props }, ref) => (
    <input {...props} ref={ref} type="file" className={`sr-only ${className}`} />
  ),
);
FileInput.displayName = "FileInput";
