import { readFileSync } from "node:fs";

const baseManifest = JSON.parse(
  readFileSync(new URL("../src/data/pwaManifest.json", import.meta.url), "utf8"),
);
const themes = JSON.parse(
  readFileSync(new URL("../src/data/pwaThemes.json", import.meta.url), "utf8"),
);

// Only the public palette/mode preference is used; no account or authentication state.
export default function handler(request, response) {
  const cookie = request.headers.cookie?.match(/(?:^|;\s*)cc_pwa_theme=([^;]+)/)?.[1];
  const theme = Object.hasOwn(themes, cookie ?? "") ? cookie : "candy-light";
  const colors = themes[theme];
  const icon = (name) => `/pwa/themes/${theme}/${name}.png?v=3`;
  response.setHeader("Content-Type", "application/manifest+json; charset=utf-8");
  response.setHeader("Cache-Control", "private, no-store");
  response.setHeader("Vary", "Cookie");
  response.end(
    JSON.stringify({
      ...baseManifest,
      theme_color: colors.primary,
      background_color: colors.background,
      icons: [
        { src: icon("icon-192"), sizes: "192x192", type: "image/png", purpose: "any" },
        { src: icon("icon-512"), sizes: "512x512", type: "image/png", purpose: "any" },
        {
          src: icon("icon-maskable-512"),
          sizes: "512x512",
          type: "image/png",
          purpose: "maskable",
        },
      ],
    }),
  );
}
