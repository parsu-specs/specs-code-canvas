import { APPEARANCES, type Appearance, type Profile } from "../data/types";

const backend = import.meta.env.VITE_DATA_SOURCE ?? "local";
const ACTIVE_KEY = `cc.viewer.v1:${backend}`;
let sessionViewer: string | null = null;

// This is a presentation hint only. AuthProvider always verifies the session
// through the auth repository before rendering protected routes.
export function activeViewerId(): string | null {
  try {
    return localStorage.getItem(ACTIVE_KEY) || null;
  } catch {
    return sessionViewer;
  }
}

export function setActiveViewer(id: string | null): void {
  sessionViewer = id;
  try {
    if (id) {
      localStorage.setItem(ACTIVE_KEY, id);
      // Claim legacy device preferences once, after a verified sign-in.
      if (!localStorage.getItem(`${ACTIVE_KEY}:legacy-migrated`)) {
        for (const key of ["cc.palette.v1", "cc.appearance.v1"]) {
          const old = localStorage.getItem(key);
          if (old && !localStorage.getItem(viewerSettingKey(key))) {
            localStorage.setItem(viewerSettingKey(key), old);
          }
        }
        localStorage.setItem(`${ACTIVE_KEY}:legacy-migrated`, "true");
      }
    } else localStorage.removeItem(ACTIVE_KEY);
  } catch {
    // Preferences still work for the current page without browser storage.
  }
}

export function viewerSettingKey(key: string): string {
  const id = activeViewerId();
  return `${key}:${backend}:${id ? `user:${id}` : "visitor"}`;
}

function profileKey(id: string): string {
  return `cc.profile-cache.v1:${backend}:${id}`;
}

function profileFields(value: unknown, id: string): Profile | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  if (row.id !== id) return null;
  const required = ["id", "name", "role", "bio", "color", "createdAt"] as const;
  if (required.some((key) => typeof row[key] !== "string")) return null;
  return {
    id,
    name: row.name as string,
    role: row.role as string,
    bio: row.bio as string,
    color: row.color as string,
    createdAt: row.createdAt as string,
    ...(typeof row.imageUrl === "string" ? { imageUrl: row.imageUrl } : {}),
    ...(typeof row.theme === "string" ? { theme: row.theme } : {}),
    ...(typeof row.palette === "string" ? { palette: row.palette } : {}),
    ...(APPEARANCES.includes(row.appearance as Appearance)
      ? { appearance: row.appearance as Appearance }
      : {}),
  };
}

export function loadCachedProfile(id: string): Profile | null {
  try {
    return profileFields(JSON.parse(localStorage.getItem(profileKey(id)) ?? "null"), id);
  } catch {
    return null;
  }
}

export function cacheProfile(profile: Profile): void {
  const safe = profileFields(profile, profile.id);
  if (!safe) return;
  try {
    localStorage.setItem(profileKey(profile.id), JSON.stringify(safe));
  } catch {
    // A full or unavailable cache must not prevent profile changes.
  }
}

export function loadCachedHasPassword(id: string): boolean | null {
  try {
    const value = localStorage.getItem(`${profileKey(id)}:has-password`);
    return value === "true" ? true : value === "false" ? false : null;
  } catch {
    return null;
  }
}

export function cacheHasPassword(id: string, value: boolean): void {
  try {
    localStorage.setItem(`${profileKey(id)}:has-password`, String(value));
  } catch {
    // This is only a display cache, never an authentication check.
  }
}
