import { expect, it } from "vitest";
import handler from "../../api/pwa-manifest.js";
import themes from "../data/pwaThemes.json";

function requestManifest(cookie?: string, url?: string) {
  const headers = new Map<string, string>();
  let body = "";
  handler(
    { url, headers: { cookie } },
    {
      setHeader: (key, value) => {
        headers.set(key, value);
      },
      end: (value) => {
        body = value;
      },
    },
  );
  return { manifest: JSON.parse(body), headers };
}

it.each(Object.entries(themes))(
  "serves %s colors and public icon URLs without a service worker",
  (theme, colors) => {
    const { manifest, headers } = requestManifest(`other=value; cc_pwa_theme=${theme}`);
    expect(manifest).toMatchObject({
      id: "/",
      start_url: "/",
      scope: "/",
      theme_color: colors.primary,
      background_color: colors.background,
    });
    expect(manifest.icons).toHaveLength(3);
    for (const icon of manifest.icons)
      expect(icon.src).toMatch(new RegExp(`^/pwa/themes/${theme}/icon-`));
    expect(headers.get("Cache-Control")).toBe("private, no-store");
    expect(headers.get("Vary")).toBe("Cookie");
  },
);

it.each(Object.entries(themes))(
  "preserves %s for Android background requests without cookies",
  (theme, colors) => {
    const { manifest } = requestManifest(undefined, `/manifest.webmanifest?theme=${theme}`);
    expect(manifest.background_color).toBe(colors.background);
    expect(manifest.icons[0].src).toContain(`/${theme}/`);
    expect(manifest.id).toBe("/");
  },
);

it("uses the current device theme when a desktop updater revisits an older manifest URL", () => {
  expect(
    requestManifest("cc_pwa_theme=forest-dark", "/manifest.webmanifest?theme=candy-light").manifest
      .icons[0].src,
  ).toContain("/forest-dark/");
  expect(
    requestManifest("cc_pwa_theme=forest-dark", "/manifest.webmanifest?theme=__proto__").manifest
      .icons[0].src,
  ).toContain("/forest-dark/");
});

it.each(["unknown", "__proto__", "../../secrets"])(
  "ignores invalid cookie %s and uses the valid theme URL",
  (cookie) => {
    expect(
      requestManifest(`cc_pwa_theme=${cookie}`, "/manifest.webmanifest?theme=ocean-dark").manifest
        .icons[0].src,
    ).toContain("/ocean-dark/");
  },
);

it.each([
  undefined,
  "cc_pwa_theme=unknown",
  "cc_pwa_theme=__proto__",
  "cc_pwa_theme=../../secrets",
])("uses a safe default for %s", (cookie) => {
  expect(requestManifest(cookie).manifest.theme_color).toBe(themes["candy-light"].primary);
  expect(requestManifest(cookie).manifest.icons[0].src).toContain("/candy-light/");
});
