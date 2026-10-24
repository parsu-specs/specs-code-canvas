import { useSyncExternalStore } from "react";
import { Ghost, Skull, Moon, Star } from "@phosphor-icons/react";
import SettingToggle from "../../components/SettingToggle";
import "./halloweenTheme.css";

const STORAGE_KEY = "cc.experimental.halloween-theme.v1";
const CHANGE_EVENT = "cc:halloween-theme-change";
let enabled = false;

function apply(value: boolean) {
  enabled = value;
  if (value) document.documentElement.dataset.halloweenTheme = "enabled";
  else delete document.documentElement.dataset.halloweenTheme;
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function restore() {
  try {
    apply(localStorage.getItem(STORAGE_KEY) === "true");
  } catch {
    // Keep the current page's choice when storage is unavailable.
  }
}

export function initializeHalloweenTheme() {
  restore();
  window.addEventListener("storage", (event) => {
    if (event.key === STORAGE_KEY || event.key === null) restore();
  });
}

function subscribe(onChange: () => void) {
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => window.removeEventListener(CHANGE_EVENT, onChange);
}

function setEnabled(value: boolean) {
  try {
    localStorage.setItem(STORAGE_KEY, String(value));
  } catch {
    // Apply the choice for this page even without persistent storage.
  }
  apply(value);
}

function Candy({ className }: { className: string; size: number; weight: string }) {
  return (
    <svg className={className} viewBox="0 0 40 40" fill="none" width="38" height="38">
      <g stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round">
        <path
          d="M12 14L3 10L5 20L3 30L12 26M28 14L37 10L35 20L37 30L28 26"
          fill="var(--color-halloween-orange)"
        />
        <rect x="10" y="11" width="20" height="18" rx="7" fill="var(--color-halloween-lilac)" />
        <path d="M17 12L13 27M25 12L21 28" />
      </g>
    </svg>
  );
}

function Pumpkin({ className }: { className: string }) {
  return (
    <svg className={`halloween-pumpkin ${className}`} viewBox="0 0 120 112" fill="none">
      <path d="M57 24Q52 9 67 5L73 10Q61 16 65 26" className="halloween-stem" />
      <path d="M62 26Q76 10 88 21Q77 32 62 26" className="halloween-leaf" />
      <path
        d="M60 27C28 8 3 32 7 65C9 97 34 107 60 100C87 108 112 94 114 65C118 32 94 9 60 27Z"
        className="halloween-rind"
      />
      <path
        d="M46 28C27 46 29 81 45 98M74 28C93 46 91 81 75 98M60 29V99"
        className="halloween-ribs"
      />
      <path
        d="M25 55L43 39L48 61ZM95 55L77 39L72 61ZM60 56L53 69H67Z"
        className="halloween-carving"
      />
      <path
        d="M26 73L41 79L47 74L54 82H66L73 74L79 79L94 73Q84 98 60 95Q36 98 26 73Z"
        className="halloween-carving"
      />
    </svg>
  );
}

export function HalloweenDecorations({
  placement = "footer",
}: {
  placement?: "footer" | "sidebar";
}) {
  if (placement === "sidebar") {
    return (
      <div className="halloween-sidebar-background" aria-hidden="true">
        <svg viewBox="0 0 280 800" preserveAspectRatio="xMidYMax slice" fill="none">
          <g stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            {/* Notebook doodles are deliberately sparse around the navigation labels. */}
            <path d="M0 0L64 64M0 0L90 20M0 0L20 90M0 28Q20 29 28 0M0 54Q40 53 54 0M0 82Q59 78 82 0M18 70Q38 61 46 46M46 46Q60 38 70 18" />
            <path d="M254 106L258 115L268 117L260 124L261 134L252 129L243 134L245 123L238 116L249 115Z" />
            <path d="M20 240L20 252M14 246H26M259 319L259 329M254 324H264" />
            <path d="M12 420Q25 398 38 419Q43 432 38 450L32 445L25 451L18 445L11 449Z" />
            <path d="M21 425V428M30 424V427M23 435Q27 438 30 434" />
            <g transform="translate(179 552) rotate(12)">
              <path d="M0 14Q10 0 20 15L23 8L27 15L32 4L35 18Q47 2 58 9L48 29Q37 22 30 34Q24 25 15 31Z" />
            </g>
            <path d="M46 611Q25 620 33 642Q45 662 65 647Q45 651 41 636Q38 623 46 611Z" />
            <path d="M234 659L234 675M226 667H242M83 704L83 714M78 709H88" />
            <g transform="translate(141 697) rotate(-9 58 50)">
              <path d="M55 22Q48 8 62 4L67 9Q56 13 61 23M61 23Q74 10 82 19Q72 29 61 23" />
              <path d="M59 25C33 10 7 29 10 57C10 84 32 96 58 91C83 99 108 84 108 58C111 28 85 11 59 25Z" />
              <path d="M44 26Q23 56 43 89M75 27Q94 59 75 91M59 26V43M59 78V92" />
              <path d="M30 52L43 40L47 57ZM86 52L74 40L70 57ZM58 55L53 66H64Z" />
              <path d="M30 70L43 75L48 71L55 78L65 77L70 70L76 74L89 68Q77 91 59 87Q39 89 30 70Z" />
            </g>
            <path
              d="M8 789Q36 782 64 788M86 791L131 790M152 794Q204 785 272 791"
              strokeDasharray="5 7"
            />
            <g transform="translate(18 735) rotate(-18 25 15)">
              <rect x="13" y="4" width="29" height="24" rx="8" />
              <path d="M13 8L2 3L5 15L2 28L13 23M42 8L53 3L50 15L53 28L42 23M24 5L19 27M34 5L29 27" />
            </g>
          </g>
        </svg>
      </div>
    );
  }
  return (
    <div className={`halloween-decorations halloween-scene-${placement}`} aria-hidden="true">
      <div className="halloween-web halloween-web-left" />
      <div className="halloween-web halloween-web-right" />
      <svg className="halloween-spider" viewBox="0 0 60 150" fill="none">
        <path d="M30 0V102" stroke="currentColor" strokeWidth="2" />
        <g stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <path d="M25 113L12 103L6 112M24 119L8 116L3 126M25 125L12 132L10 142M35 113L48 103L54 112M36 119L52 116L57 126M35 125L48 132L50 142M25 110L18 98L13 100M35 110L42 98L47 100" />
          <ellipse cx="30" cy="120" rx="10" ry="14" fill="currentColor" />
        </g>
      </svg>
      <Moon className="halloween-moon" size={64} weight="duotone" />
      <Ghost className="halloween-ghost halloween-ghost-one" size={64} weight="duotone" />
      <Ghost className="halloween-ghost halloween-ghost-two" size={42} weight="duotone" />
      <Skull className="halloween-skull" size={42} weight="duotone" />
      <Pumpkin className="halloween-pumpkin-main" />
      <Pumpkin className="halloween-pumpkin-small" />
      <Candy className="halloween-candy halloween-candy-one" size={38} weight="duotone" />
      <Candy className="halloween-candy halloween-candy-two" size={32} weight="duotone" />
      <Star className="halloween-star halloween-star-one" size={22} weight="fill" />
      <Star className="halloween-star halloween-star-two" size={16} weight="fill" />
      <Star className="halloween-star halloween-star-three" size={20} weight="fill" />
      <div className="halloween-bat halloween-bat-one" />
      <div className="halloween-bat halloween-bat-two" />
      <div className="halloween-bat halloween-bat-three" />
      <div className="halloween-bat halloween-bat-four" />
    </div>
  );
}

export default function HalloweenThemeControl() {
  const checked = useSyncExternalStore(
    subscribe,
    () => enabled,
    () => false,
  );

  return (
    <SettingToggle
      label="Halloween theme"
      description={
        <>
          Dress the whole app in pumpkin orange and purple, with cobwebs, bats, ghosts, and
          pumpkins. Saved on this device.
        </>
      }
      checked={checked}
      onCheckedChange={setEnabled}
    />
  );
}
