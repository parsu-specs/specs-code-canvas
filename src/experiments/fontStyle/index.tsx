import { useSyncExternalStore } from "react";
import Dropdown from "../../components/Dropdown";
import "./fontStyle.css";

const STORAGE_KEY = "cc.experimental.font-style.v1";
const CHANGE_EVENT = "cc:font-style-change";
const options = [
  { value: "default", label: "Default", pairing: "Fredoka headings + Nunito body" },
  { value: "serif", label: "Elegant", pairing: "Cormorant Garamond headings + Lato body" },
  { value: "playful", label: "Playful", pairing: "Baloo 2 headings + Quicksand body" },
  { value: "system", label: "Professional", pairing: "Barlow Condensed headings + Inter body" },
  { value: "courier", label: "Code", pairing: "Space Mono headings + Courier New body" },
  {
    value: "editorial",
    label: "Editorial",
    pairing: "Playfair Display headings + Source Serif 4 body",
  },
  { value: "classic", label: "Classic", pairing: "Libre Baskerville headings + Georgia body" },
  { value: "modern", label: "Modern", pairing: "Space Grotesk headings + Inter body" },
  { value: "friendly", label: "Friendly", pairing: "Quicksand headings + Nunito body" },
  {
    value: "academic",
    label: "Academic",
    pairing: "IBM Plex Serif headings + Libre Baskerville body",
  },
  { value: "retro", label: "Retro", pairing: "Righteous headings + Space Mono body" },
  { value: "minimal", label: "Minimal", pairing: "Inter headings + Lato body" },
  { value: "creative", label: "Creative", pairing: "Caveat headings + Source Serif 4 body" },
];
let fontStyle = "default";

function apply(value: string | null) {
  fontStyle = options.find((option) => option.value === value)?.value ?? "default";
  if (fontStyle === "default") delete document.documentElement.dataset.fontStyle;
  else document.documentElement.dataset.fontStyle = fontStyle;
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function restore() {
  try {
    apply(localStorage.getItem(STORAGE_KEY));
  } catch {
    // Keep the current page's choice when storage is unavailable.
  }
}

export function initializeFontStyle() {
  restore();
  window.addEventListener("storage", (event) => {
    if (event.key === STORAGE_KEY || event.key === null) restore();
  });
}

function subscribe(onChange: () => void) {
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => window.removeEventListener(CHANGE_EVENT, onChange);
}

function setFontStyle(value: string) {
  try {
    localStorage.setItem(STORAGE_KEY, value);
  } catch {
    // Apply the choice for this page even without persistent storage.
  }
  apply(value);
}

export default function FontStyleControl() {
  const value = useSyncExternalStore(
    subscribe,
    () => fontStyle,
    () => "default",
  );

  return (
    <div className="min-w-0 mt-4 max-w-full sm:max-w-sm">
      <h3 className="text-sm font-black">Font style</h3>
      <p className="mt-1 mb-3 text-sm font-bold text-muted">
        Choose a heading and body font combo. Saved on this device.
      </p>
      <Dropdown label="Font style" options={options} value={value} onChange={setFontStyle} />
      <p className="mt-3 text-xs font-bold text-muted">
        {options.find((option) => option.value === value)?.pairing}
      </p>
    </div>
  );
}
