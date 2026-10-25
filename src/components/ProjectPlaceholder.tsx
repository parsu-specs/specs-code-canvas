type Props = {
  title: string;
  color: string;
  className?: string;
  letterClassName?: string;
  artworkScale?: number;
  textColor?: string;
};

/** Shared artwork for project covers without an uploaded thumbnail. */
export default function ProjectPlaceholder({
  title,
  color,
  className = "",
  letterClassName = "text-4xl",
  artworkScale = 1,
  textColor,
}: Props) {
  return (
    <div
      data-project-placeholder
      style={{
        backgroundColor: `var(--color-${color})`,
        color: textColor ?? "var(--color-foreground)",
        backgroundImage:
          artworkScale === 1
            ? undefined
            : `repeating-linear-gradient(-45deg, transparent 0, transparent ${12 * artworkScale}px, var(--color-cover-stripe) ${12 * artworkScale}px, var(--color-cover-stripe) ${24 * artworkScale}px)`,
      }}
      className={`min-w-0 max-w-full flex items-center justify-center bg-[repeating-linear-gradient(-45deg,transparent_0,transparent_12px,var(--color-cover-stripe)_12px,var(--color-cover-stripe)_24px)] ${className}`}
    >
      <span
        className={`rotate-[-4deg] font-black ${letterClassName}`}
        style={artworkScale === 1 ? undefined : { fontSize: 36 * artworkScale }}
      >
        {title.charAt(0)}
      </span>
    </div>
  );
}
