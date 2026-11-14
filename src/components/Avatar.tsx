import { isSafeImageUrl } from "../utils/urls";

type AvatarProps = {
  name: string;
  /** Legacy profile color; avatars now follow the active site theme. */
  color?: string;
  imageUrl?: string;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
};

const sizes = {
  sm: "h-8 w-8 text-xs",
  md: "h-14 w-14 text-lg",
  lg: "h-20 w-20 text-2xl",
  xl: "h-32 w-32 text-4xl",
} as const;

export function initials(name: string): string {
  return (name.match(/\p{L}[\p{L}\p{M}]*/gu) ?? [])
    .map((part) => Array.from(part)[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default function Avatar({ name, imageUrl, size = "md", className = "" }: AvatarProps) {
  // Untrusted rows (legacy, direct-DB) may hold javascript:/data:text URLs —
  // fall back to initials instead of handing them to <img>.
  if (imageUrl && isSafeImageUrl(imageUrl)) {
    return (
      <img
        src={imageUrl}
        alt={`${name}'s profile`}
        loading="lazy"
        className={`${sizes[size]} shrink-0 rounded-full border-[3px] border-outline object-cover ${className}`}
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      className={`min-w-0 flex ${sizes[size]} shrink-0 items-center justify-center rounded-full border-[3px] border-outline bg-foreground text-panel text-center font-black leading-none ${className} max-w-full`}
    >
      {initials(name)}
    </span>
  );
}
