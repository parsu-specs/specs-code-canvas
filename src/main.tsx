import React from "react";
import { createRoot } from "react-dom/client";
import "@fontsource/fredoka/latin-700.css";
import "@fontsource/nunito/latin-400.css";
import "@fontsource/nunito/latin-700.css";
import "@fontsource/nunito/latin-900.css";
import App from "./App";
import "./styles/style.css";
import { initializeFluidText } from "./experiments/fluidText";
import { initializeBoldText } from "./experiments/boldText";
import { initializeNoBorders } from "./experiments/noBorders";
import { initializeSoftEdges } from "./experiments/softEdges";
import { initializeGlassTheme } from "./experiments/glassTheme";
import { initializeHalloweenTheme } from "./experiments/halloweenTheme";
import { initializeAppearance } from "./utils/appearance";
import { initializeFavicon } from "./utils/favicon";
import { initializePinchZoom } from "./utils/pinchZoom";
import { initializePalette } from "./utils/palette";
import { viewerSettingKey } from "./utils/viewerCache";

initializePalette();
initializeAppearance();
initializeFavicon();
initializePinchZoom();
initializeFluidText();
initializeBoldText();
initializeNoBorders();
initializeSoftEdges();
initializeGlassTheme();
initializeHalloweenTheme();
window.addEventListener("storage", (event) => {
  if (event.key === viewerSettingKey("cc.palette.v1") || event.key === null) initializePalette();
});

const fontRequests = [
  document.fonts.load('700 1em "Fredoka"'),
  document.fonts.load('400 1em "Nunito"'),
  document.fonts.load('700 1em "Nunito"'),
  document.fonts.load('900 1em "Nunito"'),
];

const fontTimeout = new Promise<void>((resolve) => {
  window.setTimeout(resolve, 1500);
});

async function startApp() {
  await Promise.race([Promise.all(fontRequests), fontTimeout]);

  createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      void navigator.serviceWorker.register("/font-cache-worker.js");
    });
  }
}

void startApp();
