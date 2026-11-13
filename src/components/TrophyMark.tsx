import { useId } from "react";
import { Trophy } from "@phosphor-icons/react";

type Place = 1 | 2 | 3;

const TIERS: Record<
  Place,
  { light: string; mid: string; dark: string; glowClassName: string; label: string }
> = {
  1: {
    light: "var(--color-gold-light)",
    mid: "var(--color-gold-mid)",
    dark: "var(--color-gold-dark)",
    glowClassName: "drop-shadow-[0_0_3px_var(--color-gold-glow)]",
    label: "Ranked #1",
  },
  2: {
    light: "var(--color-metal-highlight)",
    mid: "var(--color-silver-mid)",
    dark: "var(--color-silver-dark)",
    glowClassName: "drop-shadow-[0_0_3px_var(--color-silver-glow)]",
    label: "Ranked #2",
  },
  3: {
    light: "var(--color-bronze-light)",
    mid: "var(--color-bronze-mid)",
    dark: "var(--color-bronze-dark)",
    glowClassName: "drop-shadow-[0_0_3px_var(--color-bronze-glow)]",
    label: "Ranked #3",
  },
};

export default function TrophyMark({
  place,
  size = 24,
  minimal = false,
}: {
  place: Place;
  size?: number;
  minimal?: boolean;
}) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const tier = TIERS[place];
  const metalId = `trophy-metal-${place}-${uid}`;
  return (
    <span
      role="img"
      aria-label={tier.label}
      title={tier.label}
      className={`min-w-0 ml-1 inline-flex shrink-0 items-center align-middle transition-transform duration-150 hover:scale-125 ${minimal ? "" : tier.glowClassName} max-w-full`}
    >
      {minimal ? (
        <span className="relative inline-flex rotate-4 -translate-y-0.5">
          <span
            className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-7/12 font-black"
            style={{ color: tier.dark, fontSize: size * 0.3 }}
          >
            {place}
          </span>
          <Trophy
            size={size}
            weight="duotone"
            aria-hidden="true"
            style={{
              color: tier.dark,
              filter: `drop-shadow(1px 2px 1px ${tier.mid})`,
            }}
          />
        </span>
      ) : (
        <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
          <defs>
            <linearGradient id={metalId} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor={tier.light} />
              <stop offset="55%" stopColor={tier.mid} />
              <stop offset="100%" stopColor={tier.dark} />
            </linearGradient>
          </defs>
          {/* handles */}
          <path
            d="M7.6 6.5 C4.2 7 4.2 12.5 10.5 13.8"
            fill="none"
            stroke={`url(#${metalId})`}
            strokeWidth="2.2"
            strokeLinecap="round"
          />
          <path
            d="M24.4 6.5 C27.8 7 27.8 12.5 21.5 13.8"
            fill="none"
            stroke={`url(#${metalId})`}
            strokeWidth="2.2"
            strokeLinecap="round"
          />
          {/* bowl */}
          <path
            d="M7 4 H25 C25 11 21 15.5 17.6 16.8 H14.4 C11 15.5 7 11 7 4 Z"
            fill={`url(#${metalId})`}
            stroke={tier.dark}
            strokeWidth="1.2"
            strokeLinejoin="round"
          />
          {/* bowl shine */}
          <path
            d="M10.2 6.5 C10.2 9.8 11.4 12.3 13.4 13.8"
            fill="none"
            stroke="var(--color-metal-highlight)"
            strokeWidth="1.8"
            strokeLinecap="round"
            opacity="0.65"
          />
          {/* winner star */}
          <polygon
            points="16,7.2 16.9,9.6 19.4,9.7 17.4,11.3 18.1,13.7 16,12.3 13.9,13.7 14.6,11.3 12.6,9.7 15.1,9.6"
            fill={tier.light}
            opacity="0.95"
          />
          {/* stem */}
          <rect x="14.6" y="16.8" width="2.8" height="4.5" fill={`url(#${metalId})`} />
          {/* collar */}
          <rect
            x="12.4"
            y="21.3"
            width="7.2"
            height="2.2"
            rx="1"
            fill={`url(#${metalId})`}
            stroke={tier.dark}
            strokeWidth="0.8"
          />
          {/* base */}
          <rect
            x="9.5"
            y="23.5"
            width="13"
            height="3"
            rx="1.2"
            fill={`url(#${metalId})`}
            stroke={tier.dark}
            strokeWidth="1"
          />
        </svg>
      )}
    </span>
  );
}
