import React from "react";

type BrandProps = {
  /** Lockup sits on a `--color-brand-surface` background (sidebar, footer). */
  light?: boolean;
  /** Lockup sits on a `--color-primary` background, which lightens in dark mode. */
  onPrimary?: boolean;
  compact?: boolean;
  monogram?: boolean;
  text?: boolean;
  size?: "default" | "navigation";
  className?: string;
};

export default function Brand({
  light = false,
  onPrimary = false,
  compact = false,
  monogram = false,
  text = false,
  size = "default",
  className = "",
}: BrandProps) {
  // "light" targets a --color-brand-surface background while "onPrimary"
  // targets a --color-primary background. They only coincide in light mode:
  // dark mode turns the primary surface into a light pastel, so the header
  // lockup needs primary-foreground/secondary to stay readable there.
  const base = onPrimary
    ? "text-primary-foreground"
    : light
      ? "text-brand-foreground"
      : "text-foreground";
  const accent = onPrimary ? "text-secondary" : light ? "text-brand-accent" : "text-primary";
  const textSize = size === "navigation" ? "text-2xl" : "text-base sm:text-xl";
  if (text) {
    return (
      <span className={`font-display ${textSize} font-bold ${base} ${className}`}>
        Code<span className={accent}>Canvas</span>
      </span>
    );
  }

  if (monogram) {
    return (
      <span
        aria-label="CodeCanvas"
        className={`font-display text-2xl font-bold ${base} ${className}`}
      >
        C<span className={accent}>C</span>
      </span>
    );
  }
  return (
    <span className={`min-w-0 inline-flex items-center gap-3 ${className} max-w-full`}>
      <span
        aria-label="CodeCanvas"
        className={`shrink-0 font-display text-3xl font-bold sm:text-4xl ${base}`}
      >
        C<span className={accent}>C</span>
      </span>
      {!compact && (
        <div className="min-w-0 flex flex-col gap-0 max-w-full">
          <span className={`font-display text-base sm:text-xl font-bold ${base}`}>
            Code<span className={accent}>Canvas</span>
          </span>
          <span className={`-mt-1 text-xs font-black ${accent}`}>by SPECS</span>
        </div>
      )}
    </span>
  );
}
