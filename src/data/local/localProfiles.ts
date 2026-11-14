import { validateUsername } from "../../utils/username";
import { validateFullName } from "../../utils/fullName";
import { captureMentions } from "../../utils/mentions";
import { accountRole, rejectRolePatch } from "../accountRoles";
import { NotFoundError, type ProfileRepo } from "../repositories";
import {
  AVATAR_COLORS,
  PROFILE_THEMES,
  SITE_PALETTE_IDS,
  type AppItem,
  type Comment,
  type Profile,
  type User,
} from "../types";
import { seedProfiles } from "./seed";

const PROFILES_KEY = "cc.profiles.v1";

const ALLOWED_COLORS = new Set<string>(AVATAR_COLORS);

function delay(ms = 80): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

export function loadProfiles(): Profile[] {
  try {
    const raw = localStorage.getItem(PROFILES_KEY);
    if (!raw) {
      localStorage.setItem(PROFILES_KEY, JSON.stringify(seedProfiles));
      return structuredClone(seedProfiles);
    }
    const parsed = JSON.parse(raw) as Profile[];
    if (!Array.isArray(parsed)) return structuredClone(seedProfiles);
    // Merge missing seeds and backfill seed avatars without wiping user edits.
    const byId = new Map(parsed.map((p) => [p.id, p]));
    let mutated = false;
    for (const seed of seedProfiles) {
      const existing = byId.get(seed.id);
      if (!existing) {
        byId.set(seed.id, { ...seed });
        mutated = true;
      } else if (!existing.imageUrl && seed.imageUrl) {
        byId.set(seed.id, { ...existing, imageUrl: seed.imageUrl });
        mutated = true;
      }
    }
    const merged = [...byId.values()].map((profile) => ({
      ...profile,
      role: accountRole(profile.role),
    }));
    if (mutated) localStorage.setItem(PROFILES_KEY, JSON.stringify(merged));
    return merged;
  } catch {
    return structuredClone(seedProfiles);
  }
}

function saveProfiles(profiles: Profile[]): void {
  localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));
}

/** Profiles for the given user ids (missing ids skipped), alphabetical by name. */
/** Snapshot legacy local posts before names change. */
export function freezeLegacyLocalMentions(): void {
  const profiles = loadProfiles();
  const parse = (raw: string): unknown => {
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  };
  const appsRaw = localStorage.getItem("cc.apps.v1");
  if (appsRaw) {
    const parsed = parse(appsRaw);
    const apps = Array.isArray(parsed)
      ? parsed.filter((app): app is AppItem => app && typeof app === "object")
      : [];
    if (apps.some((app) => app.mentions === undefined)) {
      localStorage.setItem(
        "cc.apps.v1",
        JSON.stringify(
          apps.map((app) => ({
            ...app,
            mentions: app.mentions ?? captureMentions(app.description ?? "", profiles),
          })),
        ),
      );
    }
  }
  const commentsRaw = localStorage.getItem("cc.comments.v1");
  if (commentsRaw) {
    const parsed = parse(commentsRaw);
    const threads =
      parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? (parsed as Record<string, Comment[]>)
        : {};
    let changed = false;
    for (const comments of Object.values(threads)) {
      if (!Array.isArray(comments)) continue;
      for (const comment of comments) {
        if (!comment || typeof comment !== "object") continue;
        if (comment.mentions === undefined) {
          comment.mentions = captureMentions(comment.body ?? "", profiles);
          changed = true;
        }
      }
    }
    if (changed) localStorage.setItem("cc.comments.v1", JSON.stringify(threads));
  }
}

export function getLocalProfilesByIds(ids: string[]): Profile[] {
  if (ids.length === 0) return [];
  const wanted = new Set(ids);
  return loadProfiles()
    .filter((p) => wanted.has(p.id))
    .sort((a, b) => a.name.localeCompare(b.name));
}

function isValidImageUrl(value: string): boolean {
  if (!value) return true;
  if (value.startsWith("data:image/")) return value.length <= 500_000;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

export function createLocalProfileRepo(): ProfileRepo {
  return {
    async listProfiles(): Promise<Profile[]> {
      await delay(60);
      return loadProfiles().sort((a, b) => a.name.localeCompare(b.name));
    },

    async getProfile(id: string): Promise<Profile> {
      await delay(60);
      const found =
        loadProfiles().find((p) => p.id === id) ??
        loadProfiles().find((p) => p.id.toLowerCase() === id.toLowerCase());
      if (!found) throw new NotFoundError("Developer not found.");
      return found;
    },

    async getProfileByName(name: string): Promise<Profile | null> {
      await delay(40);
      const clean = name.trim().toLowerCase();
      if (!clean) return null;
      return loadProfiles().find((p) => p.name.toLowerCase() === clean) ?? null;
    },

    async ensureUserProfile(user: User): Promise<Profile> {
      await delay(40);
      const profiles = loadProfiles();
      const existing = profiles.find((p) => p.id === user.id);
      if (existing) return existing;
      if (profiles.some((p) => p.name.trim().toLowerCase() === user.name.trim().toLowerCase())) {
        throw new Error("That username is already taken. Try signing in instead.");
      }
      if (user.requiresProfileSetup) throw new Error("Complete your profile to continue.");
      validateUsername(user.name);
      const created: Profile = {
        id: user.id,
        name: user.name,
        fullName: user.fullName ?? user.name,
        role: "Guest",
        bio: "Exploring digital creations across the community.",
        color: "sky",
        createdAt: new Date().toISOString(),
      };
      saveProfiles([...profiles, created]);
      return created;
    },

    async updateProfile(id, patch, requesterId): Promise<Profile> {
      rejectRolePatch(patch);
      await delay(100);
      if (id !== requesterId) throw new Error("You can only edit your own profile.");
      const profiles = loadProfiles();
      const target = profiles.find((p) => p.id === id);
      if (!target) throw new NotFoundError("Developer not found.");
      const fullName =
        patch.fullName !== undefined
          ? validateFullName(patch.fullName)
          : (target.fullName ?? target.name);
      const bio = patch.bio?.trim() ?? target.bio;
      const color = patch.color?.trim() ?? target.color;
      const imageUrl =
        patch.imageUrl !== undefined ? patch.imageUrl.trim() : (target.imageUrl ?? "");
      const name = patch.name?.trim() || target.name;
      if (!name) throw new Error("Name is required.");
      if (name.length > 40) throw new Error("Keep your name under 40 characters.");
      // Same rule as the Supabase repo: uniqueness is policed on rename
      // only, so palette/theme/bio-only saves never trip over duplicates.
      if (name !== target.name) {
        validateUsername(name);
        const taken = profiles.some(
          (p) => p.id !== id && p.name.trim().toLowerCase() === name.toLowerCase(),
        );
        if (taken) throw new Error("That name is already taken by another developer.");
      }
      if (bio.length > 280) throw new Error("Keep bio under 280 characters.");
      if (!ALLOWED_COLORS.has(color)) throw new Error("Pick a valid avatar color.");
      if (!isValidImageUrl(imageUrl)) throw new Error("Image must be a valid http(s) URL.");
      const theme = patch.theme !== undefined ? patch.theme.trim() || undefined : target.theme;
      if (theme !== undefined && !(PROFILE_THEMES as readonly string[]).includes(theme)) {
        throw new Error("Pick a valid profile theme.");
      }
      const palette =
        patch.palette !== undefined ? patch.palette.trim() || undefined : target.palette;
      if (palette !== undefined && !(SITE_PALETTE_IDS as readonly string[]).includes(palette)) {
        throw new Error("Pick a valid website palette.");
      }
      const updated: Profile = {
        ...target,
        fullName,
        name,
        bio,
        color,
        imageUrl: imageUrl || undefined,
        theme,
        palette,
      };
      freezeLegacyLocalMentions();
      saveProfiles(profiles.map((p) => (p.id === id ? updated : p)));
      return updated;
    },
  };
}
