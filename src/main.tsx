import React from "react";
import { createRoot } from "react-dom/client";
import "@fontsource/fredoka/latin-700.css";
import "@fontsource/nunito/latin-400.css";
import "@fontsource/nunito/latin-700.css";
import "@fontsource/nunito/latin-900.css";
import App from "./App";
import { preloadInitialPage } from "./pages/Main";
import "./styles/style.css";
import { initializeFluidText } from "./experiments/fluidText";
import { initializeBoldText } from "./experiments/boldText";
import { initializeFontStyle } from "./experiments/fontStyle";
import { initializeScrollbars } from "./experiments/scrollbars";
import { initializeNoBorders } from "./experiments/noBorders";
import { initializeSoftEdges } from "./experiments/softEdges";
import { initializeGlassTheme } from "./experiments/glassTheme";
import { initializeHalloweenTheme } from "./experiments/halloweenTheme";
import { initializeAppearance } from "./utils/appearance";
import { initializeFavicon } from "./utils/favicon";
import { initializePalette } from "./utils/palette";
import { viewerSettingKey } from "./utils/viewerCache";

initializePalette();
initializeAppearance();
initializeFavicon();
initializeFluidText();
initializeBoldText();
initializeFontStyle();
initializeNoBorders();
initializeScrollbars();
initializeSoftEdges();
initializeGlassTheme();
initializeHalloweenTheme();
preloadInitialPage();
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

function startApp() {
  const fontReadiness = Promise.race([Promise.all(fontRequests), fontTimeout]).catch(
    () => undefined,
  );

  createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <App fontReadiness={fontReadiness} />
    </React.StrictMode>,
  );

  if ("serviceWorker" in navigator) {
    const register = () => {
      void navigator.serviceWorker.register("/font-cache-worker.js").catch(() => undefined);
    };
    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });
  }
}

void startApp();
