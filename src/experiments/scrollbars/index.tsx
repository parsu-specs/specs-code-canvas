import { useSyncExternalStore } from "react";
import SettingToggle from "../../components/SettingToggle";
import "./scrollbars.css";

const STORAGE_KEY = "cc.experimental.scrollbars.v1";
const CHANGE_EVENT = "cc:scrollbars-change";
let enabled = false;

function apply(value: boolean) {
  enabled = value;
  if (value) document.documentElement.dataset.scrollbars = "visible";
  else delete document.documentElement.dataset.scrollbars;
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function restore() {
  try {
    apply(localStorage.getItem(STORAGE_KEY) === "true");
  } catch {
    // Keep the current page's choice when storage is unavailable.
  }
}

export function initializeScrollbars() {
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

export default function ScrollbarsControl() {
  const checked = useSyncExternalStore(
    subscribe,
    () => enabled,
    () => false,
  );

  return (
    <SettingToggle
      label="Show scrollbars"
      description={
        <>Show scrollbars throughout the website. Scrolling works with either setting.</>
      }
      checked={checked}
      onCheckedChange={setEnabled}
    />
  );
}
