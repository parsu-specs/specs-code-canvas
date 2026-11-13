import { forwardRef, useEffect, useRef, useState } from "react";
import type {
  AnchorHTMLAttributes,
  ButtonHTMLAttributes,
  LabelHTMLAttributes,
  ReactNode,
  HTMLAttributes,
} from "react";

export type ButtonVariant =
  | "icon"
  | "avatar"
  | "menu"
  | "plain"
  | "minimal"
  | "primary"
  | "secondary"
  | "surface"
  | "danger"
  | "outline"
  | "outline-flat"
  | "ghost"
  | "filter"
  | "vote"
  | "text";

type ButtonSize = "default" | "small" | "compact" | "compact-icon";

type ButtonStyleProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  fullWidth?: boolean;
  fullHeight?: boolean;
  children?: ReactNode;
};

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & ButtonStyleProps;

type ButtonLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> &
  ButtonStyleProps & {
    href: string;
  };

type ButtonLabelProps = LabelHTMLAttributes<HTMLLabelElement> & ButtonStyleProps;
type ButtonChipProps = HTMLAttributes<HTMLSpanElement> &
  Pick<ButtonStyleProps, "className" | "children"> & {
    tone?: "default" | "gold" | "silver" | "bronze" | "muted";
  };

const commonClasses =
  "inline-flex min-w-0 max-w-full whitespace-normal wrap-anywhere items-center justify-center gap-2 [&>svg]:shrink-0 font-black focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-secondary focus-visible:ring-offset-2";

const variantClasses: Record<ButtonVariant, string> = {
  avatar:
    "shrink-0 rounded-full border-0 bg-transparent p-0 leading-none transition-[translate,box-shadow,filter] duration-100 ease-out enabled:hover:-translate-y-1 enabled:hover:shadow-[0_4px_0_var(--color-outline)] enabled:active:translate-y-0 enabled:active:shadow-none enabled:active:brightness-90 data-[touch-pressed=true]:translate-y-0 data-[touch-pressed=true]:shadow-none data-[touch-pressed=true]:brightness-90 motion-reduce:transition-none disabled:cursor-not-allowed disabled:opacity-60",
  icon: "shrink-0 rounded-full border-2 border-outline bg-surface transition-colors hover:bg-background disabled:cursor-not-allowed disabled:opacity-60",
  menu: "w-full justify-start rounded-2xl px-3 py-2 text-left text-sm hover:bg-background disabled:cursor-not-allowed disabled:opacity-60",
  plain:
    "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-secondary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60",
  primary: "rounded-2xl border-[3px] border-outline bg-primary text-primary-foreground",
  minimal:
    "cursor-pointer rounded-2xl border-0 bg-transparent text-primary disabled:cursor-default disabled:text-muted",
  secondary: "rounded-2xl border-[3px] border-outline bg-secondary text-foreground",
  surface: "rounded-2xl border-[3px] border-outline bg-surface text-inherit",
  danger: "rounded-2xl border-[3px] border-outline bg-danger text-primary-foreground",
  outline:
    "rounded-2xl border-2 border-outline bg-transparent px-3 py-2 text-foreground transition-colors hover:bg-background disabled:cursor-not-allowed disabled:opacity-60",
  "outline-flat":
    "rounded-2xl border-2 border-outline bg-transparent text-foreground transition-colors aria-pressed:bg-primary aria-pressed:text-primary-foreground aria-pressed:hover:bg-primary hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-60",
  ghost:
    "text-sm decoration-2 transition-colors hover:text-primary disabled:cursor-not-allowed disabled:opacity-60",
  filter:
    "rounded-2xl border-2 border-outline bg-transparent text-foreground transition-colors aria-pressed:bg-primary aria-pressed:text-primary-foreground aria-pressed:hover:bg-primary aria-selected:bg-primary aria-selected:text-primary-foreground aria-selected:hover:bg-primary hover:bg-background disabled:cursor-not-allowed disabled:opacity-60",
  vote: "gap-1 transition-colors hover:text-primary aria-pressed:text-vote aria-pressed:hover:text-vote disabled:cursor-not-allowed disabled:opacity-60",
  text: "inline border-0 bg-transparent p-0 font-inherit text-inherit transition-colors hover:text-primary disabled:cursor-not-allowed disabled:opacity-60",
};

const raisedShellClasses = [
  "group",
  "relative",
  "isolate",
  "min-w-0",
  "max-w-full",
  "inline-flex",
  "cursor-pointer",
  "border-0",
  "bg-transparent",
  "p-0",
  "pb-2",
  "pr-2",
  "text-left",
  "rounded-2xl",

  "focus-visible:outline-none",
  "focus-visible:ring-4",
  "focus-visible:ring-secondary",
  "focus-visible:ring-offset-2",

  "disabled:cursor-not-allowed",
].join(" ");

const raisedSideClasses = [
  "absolute",
  "z-0",

  "right-0",
  "bottom-0",

  "top-1",
  "left-1",

  "rounded-[20px]",
  "border-[3px]",
  "border-outline",
  "bg-outline",

  "transition-[top,left,border-radius]",
  "duration-100",
  "ease-out",

  "group-hover:top-0",
  "group-hover:left-0",
  "group-hover:rounded-tr-3xl",
  "group-hover:rounded-bl-3xl",

  "group-active:top-2",
  "group-active:left-2",

  "group-data-[touch-pressed=true]:top-2",
  "group-data-[touch-pressed=true]:left-2",

  "group-disabled:top-2",
  "group-disabled:left-2",
].join(" ");

const raisedFaceClasses = [
  "min-w-0",
  "max-w-full",
  "whitespace-normal",
  "wrap-anywhere",
  "[&>svg]:shrink-0",
  "relative",
  "z-10",
  "inline-flex",
  "w-full",
  "items-center",
  "justify-center",
  "gap-2",
  "rounded-2xl",
  "border-[3px]",
  "border-outline",
  "font-black",

  "translate-x-1",
  "translate-y-1",

  "transition-[transform,translate,filter]",
  "duration-100",
  "ease-out",

  "group-hover:translate-x-0",
  "group-hover:translate-y-0",

  "group-active:translate-x-2",
  "group-active:translate-y-2",
  "group-active:brightness-90",

  "group-data-[touch-pressed=true]:translate-x-2",
  "group-data-[touch-pressed=true]:translate-y-2",
  "group-data-[touch-pressed=true]:brightness-90",

  "group-disabled:translate-x-2",
  "group-disabled:translate-y-2",
  "group-disabled:brightness-100",
].join(" ");

const raisedVariants = new Set<ButtonVariant>(["primary", "secondary", "surface", "danger"]);

// Keep quick taps visible through the 100ms transition without delaying clicks.
function useTouchPress<T extends HTMLElement>(props: HTMLAttributes<T>, enabled: boolean) {
  const [pressed, setPressed] = useState(false);
  const startedAt = useRef(0);
  const pointerId = useRef<number | null>(null);
  const releaseTimer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => () => clearTimeout(releaseTimer.current), []);

  return {
    "data-touch-pressed": enabled && pressed ? "true" : undefined,
    onPointerDown: ((event) => {
      props.onPointerDown?.(event);
      if (!enabled || event.defaultPrevented || event.pointerType === "mouse" || !event.isPrimary) {
        return;
      }
      clearTimeout(releaseTimer.current);
      pointerId.current = event.pointerId;
      startedAt.current = performance.now();
      setPressed(true);
    }) satisfies NonNullable<HTMLAttributes<T>["onPointerDown"]>,
    onPointerUp: ((event) => {
      if (pointerId.current === event.pointerId) {
        pointerId.current = null;
        releaseTimer.current = setTimeout(
          () => setPressed(false),
          Math.max(0, 160 - (performance.now() - startedAt.current)),
        );
      }
      props.onPointerUp?.(event);
    }) satisfies NonNullable<HTMLAttributes<T>["onPointerUp"]>,
    onPointerCancel: ((event) => {
      if (pointerId.current === event.pointerId) {
        clearTimeout(releaseTimer.current);
        pointerId.current = null;
        setPressed(false);
      }
      props.onPointerCancel?.(event);
    }) satisfies NonNullable<HTMLAttributes<T>["onPointerCancel"]>,
  };
}

const sizeClasses: Record<ButtonSize, string> = {
  default: "px-5 py-3",
  small: "px-4 py-2 text-sm",
  compact: "px-3 py-1 text-xs",
  "compact-icon": "p-1 text-xs",
};

const filterSizeClasses: Record<ButtonSize, string> = {
  default: "px-3 py-2 text-sm",
  small: "px-3 py-1.5 text-sm",
  compact: "px-2 py-1 text-xs",
  "compact-icon": "p-1 text-xs",
};

function buttonClassName(
  variant: ButtonVariant,
  size: ButtonSize,
  className: string | undefined,
  fullWidth: boolean,
  fullHeight: boolean,
) {
  if (variant === "plain") {
    return [
      "min-w-0 max-w-full wrap-anywhere",
      variantClasses.plain,
      fullWidth ? "w-full" : "",
      fullHeight ? "h-full" : "",
      className ?? "",
    ]
      .filter(Boolean)
      .join(" ");
  }
  if (raisedVariants.has(variant)) {
    return [
      raisedShellClasses,
      fullWidth ? "w-full" : "",
      fullHeight ? "h-full" : "",
      className ?? "",
    ]
      .filter(Boolean)
      .join(" ");
  }

  const sizeClass =
    variant === "icon"
      ? ({ default: "p-2", small: "p-1.5", compact: "p-1", "compact-icon": "p-0.5" } as const)[size]
      : variant === "minimal"
        ? sizeClasses[size]
        : variant === "filter" || variant === "outline-flat"
          ? filterSizeClasses[size]
          : variant === "vote"
            ? size === "compact"
              ? "text-xs"
              : "text-sm"
            : "";

  return [
    variant === "text" ? commonClasses.replace("inline-flex", "inline") : commonClasses,
    variantClasses[variant],
    sizeClass,
    fullWidth ? "w-full" : "",
    fullHeight ? "h-full" : "",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");
}

function buttonFaceClassName(variant: ButtonVariant, size: ButtonSize, fullHeight: boolean) {
  return [raisedFaceClasses, variantClasses[variant], sizeClasses[size], fullHeight ? "h-full" : ""]
    .filter(Boolean)
    .join(" ");
}

function buttonContents(
  variant: ButtonVariant,
  size: ButtonSize,
  fullHeight: boolean,
  children: ReactNode,
) {
  if (!raisedVariants.has(variant)) {
    return children;
  }

  return (
    <>
      <span className={raisedSideClasses} aria-hidden="true" />

      <span className={buttonFaceClassName(variant, size, fullHeight)}>{children}</span>
    </>
  );
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = "primary",
    size = "default",
    className,
    fullWidth = false,
    fullHeight = false,
    children,
    type = "button",
    ...props
  }: ButtonProps,
  ref,
) {
  const clickableClass = props.onClick && !props.disabled ? "cursor-pointer" : "";
  const touchPress = useTouchPress(
    props,
    (raisedVariants.has(variant) || variant === "avatar") && !props.disabled,
  );

  return (
    <button
      ref={ref}
      {...props}
      {...touchPress}
      type={type}
      className={buttonClassName(
        variant,
        size,
        [className, clickableClass].filter(Boolean).join(" "),
        fullWidth,
        fullHeight,
      )}
    >
      {buttonContents(variant, size, fullHeight, children)}
    </button>
  );
});

export function ButtonLink({
  variant = "primary",
  size = "default",
  className,
  fullWidth = false,
  fullHeight = false,
  children,
  href,
  ...props
}: ButtonLinkProps) {
  const touchPress = useTouchPress(props, raisedVariants.has(variant));
  return (
    <a
      {...props}
      {...touchPress}
      href={href}
      className={buttonClassName(variant, size, className, fullWidth, fullHeight)}
    >
      {buttonContents(variant, size, fullHeight, children)}
    </a>
  );
}

export function ButtonLabel({
  variant = "primary",
  size = "default",
  className,
  fullWidth = false,
  fullHeight = false,
  children,
  ...props
}: ButtonLabelProps) {
  const touchPress = useTouchPress(props, raisedVariants.has(variant));
  return (
    <label
      {...props}
      {...touchPress}
      className={buttonClassName(
        variant,
        size,
        `focus-within:ring-4 focus-within:ring-secondary focus-within:ring-offset-2 ${className ?? ""}`,
        fullWidth,
        fullHeight,
      )}
    >
      {buttonContents(variant, size, fullHeight, children)}
    </label>
  );
}

const chipToneClasses = {
  default: "bg-tertiary text-foreground",
  gold: "bg-secondary text-foreground",
  silver: "bg-medal-silver text-foreground",
  bronze: "bg-medal-bronze text-inverse-foreground",
  muted: "bg-muted text-primary-foreground",
} satisfies Record<NonNullable<ButtonChipProps["tone"]>, string>;

export function ButtonChip({ className, children, tone = "default", ...props }: ButtonChipProps) {
  return (
    <span
      {...props}
      className={[
        "inline-flex items-center rounded-full px-2 py-0.5 align-middle text-[10px] font-black uppercase",
        chipToneClasses[tone],
        className ?? "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </span>
  );
}
