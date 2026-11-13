# Scrollbars

Scrollbars are hidden by default while wheel, touch, trackpad, and keyboard scrolling remain available. Settings > Experimental > Show scrollbars restores the existing scrollbar styles.

The preference is stored per browser as `cc.experimental.scrollbars.v1`, applied before React mounts, and synchronized across tabs. If storage is unavailable, the toggle still works for the current page. The CSS defaults to hidden even before initialization, and removes reserved scrollbar gutters while hidden.

To remove this experiment, remove its control from SettingsView, its initialization from main.tsx, and this folder.
