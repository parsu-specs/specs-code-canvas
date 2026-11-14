// Run with: node --experimental-strip-types build/generatePwaThemes.mjs
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { DARK_PALETTES } from "../src/utils/darkPalettes.ts";

const css = readFileSync(new URL("../src/styles/style.css", import.meta.url), "utf8");
const declarations = (text) =>
  Object.fromEntries(
    [...text.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)].map((match) => [match[1], match[2].trim()]),
  );
const base = declarations(css.match(/@theme\s*\{([\s\S]*?)\n\}/)[1]);
const light = declarations(css.match(/:root\s*\{([\s\S]*?)\}/)[1]);
const dark = declarations(css.match(/:root\[data-mode="dark"\]\s*\{([\s\S]*?)\}/)[1]);
const themes = {};
for (const palette of Object.keys(DARK_PALETTES)) {
  const block = css.match(new RegExp(`:root\\[data-palette="${palette}"\\]\\s*\\{([\\s\\S]*?)\\}`));
  for (const mode of ["light", "dark"]) {
    const variables = { ...base, ...light, ...declarations(block?.[1] ?? "") };
    if (mode === "dark") {
      Object.assign(variables, dark);
      for (const [role, value] of Object.entries(DARK_PALETTES[palette].colors))
        variables[`--color-${role}`] = value;
    }
    const resolve = (name) =>
      variables[name].replace(/var\((--[\w-]+)\)/g, (_, key) => resolve(key));
    themes[`${palette}-${mode}`] = {
      primary: resolve("--color-primary"),
      surface: resolve("--color-brand-surface"),
      ink: resolve("--color-brand-foreground"),
      accent: resolve("--color-brand-accent"),
      secondary: resolve("--color-secondary"),
      background: resolve("--color-background"),
    };
  }
}
const directory = new URL("../public/pwa/themes/", import.meta.url);
mkdirSync(directory, { recursive: true });
writeFileSync(
  new URL("../src/data/pwaThemes.json", import.meta.url),
  JSON.stringify(themes, null, 2) + "\n",
);
