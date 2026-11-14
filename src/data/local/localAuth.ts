import { validateUsername } from "../../utils/username";
import { validateFullName } from "../../utils/fullName";
import { MOCK_USERS } from "../../auth/mockCredentials";
import { loadProfiles } from "./localProfiles";
import {
  AuthError,
  type AuthRepo,
  type GoogleAccount,
  type GoogleSignInResult,
} from "../repositories";
import type { User } from "../types";

const SESSION_KEY = "cc.session.v1";
const NAMES_KEY = "cc.display_names.v1";
const GOOGLE_USERS_KEY = "cc.google_users.v1";
const LOCAL_USERS_KEY = "cc.local_users.v1";

type LocalAccount = {
  id: string;
  email: string;
  name: string;
  fullName?: string;
  salt: string;
  passwordHash: string;
};

// Demo-grade password hashing (salted SHA-256 via Web Crypto). This stops
// shoulder-surfing localStorage, not real attackers — a production backend
// must use bcrypt/argon2 server-side.
async function hashPassword(password: string, salt: string): Promise<string> {
  const bytes = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(`${salt}::${password}`),
  );
  return [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function randomSalt(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
}

function loadLocalUsers(): LocalAccount[] {
  try {
    const raw = localStorage.getItem(LOCAL_USERS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as LocalAccount[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function emailTaken(email: string): boolean {
  const normalized = email.trim().toLowerCase();
  if (MOCK_USERS.some((u) => u.email.toLowerCase() === normalized)) return true;
  if (loadLocalUsers().some((u) => u.email.toLowerCase() === normalized)) return true;
  try {
    const raw = localStorage.getItem(GOOGLE_USERS_KEY);
    if (raw) {
      const stored = JSON.parse(raw) as Record<string, { email: string }>;
      if (
        typeof stored === "object" &&
        stored !== null &&
        Object.values(stored).some((r) => r.email.toLowerCase() === normalized)
      ) {
        return true;
      }
    }
  } catch {
    // Ignore corrupt store.
  }
  return false;
}

function loadGoogleUsers(): Record<string, { id: string; email: string; name: string }> {
  try {
    const raw = localStorage.getItem(GOOGLE_USERS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, { id: string; email: string; name: string }>;
    return typeof parsed === "object" && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

function delay(ms = 120): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function toUser(found: { id: string; email: string; name: string }): User {
  return { id: found.id, email: found.email, name: found.name };
}

function loadNameOverrides(): Record<string, string> {
  try {
    const raw = localStorage.getItem(NAMES_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, string>;
    return typeof parsed === "object" && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

function applyOverride(user: User): User {
  const profile = loadProfiles().find((entry) => entry.id === user.id);
  if (profile)
    return {
      ...user,
      name: profile.name,
      fullName: profile.fullName ?? user.fullName,
      requiresProfileSetup: false,
    };
  const custom = loadNameOverrides()[user.id]?.trim();
  return custom ? { ...user, name: custom } : user;
}

export function createLocalAuthRepo(): AuthRepo {
  return {
    async getSession(): Promise<User | null> {
      await delay(80);
      const raw = localStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      try {
        const parsed = JSON.parse(raw) as User;
        if (!parsed?.id || !parsed?.email) throw new Error("bad session");
        return applyOverride(parsed);
      } catch {
        localStorage.removeItem(SESSION_KEY);
        return null;
      }
    },

    async signin(email: string, password: string): Promise<User> {
      await delay();
      const normalizedEmail = email.trim().toLowerCase();
      const found = MOCK_USERS.find(
        (u) => u.email.toLowerCase() === normalizedEmail && u.password === password,
      );
      if (found) {
        const user = applyOverride(toUser(found));
        localStorage.setItem(SESSION_KEY, JSON.stringify(user));
        return user;
      }
      const local = loadLocalUsers().find((u) => u.email.toLowerCase() === normalizedEmail);
      if (local && (await hashPassword(password, local.salt)) === local.passwordHash) {
        const user = applyOverride({
          id: local.id,
          email: local.email,
          name: local.name,
          fullName: local.fullName,
        });
        localStorage.setItem(SESSION_KEY, JSON.stringify(user));
        return user;
      }
      throw new AuthError();
    },

    async signup(
      name: string,
      email: string,
      password: string,
      _captchaToken?: string,
      fullName?: string,
    ): Promise<User> {
      await delay();
      const cleanName = validateUsername(name);
      const cleanFullName = fullName !== undefined ? validateFullName(fullName) : cleanName;
      const cleanEmail = email.trim();
      if (!cleanName) throw new Error("Name is required.");
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail))
        throw new Error("Enter a valid email address.");
      if (password.length < 6) throw new Error("Password must be at least 6 characters.");
      if (emailTaken(cleanEmail))
        throw new Error("That email is already registered. Sign in instead.");
      // Usernames are unique across the whole local identity domain:
      // profiles (including seeds), already-created accounts, Google users,
      // and renames stored in the override map. Profiles alone would miss the
      // window right after signup, before ensureUserProfile adds the row.
      const lowerName = cleanName.toLowerCase();
      const nameClash =
        loadProfiles().some((p) => p.name.trim().toLowerCase() === lowerName) ||
        loadLocalUsers().some((u) => u.name.trim().toLowerCase() === lowerName) ||
        Object.values(loadGoogleUsers()).some((r) => r.name.trim().toLowerCase() === lowerName) ||
        Object.values(loadNameOverrides()).some((n) => n.trim().toLowerCase() === lowerName);
      if (nameClash) throw new Error("That username is already taken. Try another.");
      const salt = randomSalt();
      const account: LocalAccount = {
        id: `local-${randomSalt()}`,
        email: cleanEmail,
        name: cleanName,
        fullName: cleanFullName,
        salt,
        passwordHash: await hashPassword(password, salt),
      };
      const users = loadLocalUsers();
      try {
        localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify([...users, account]));
      } catch {
        throw new Error("Storage is full. Could not create your account.");
      }
      const user = applyOverride({
        id: account.id,
        email: account.email,
        name: account.name,
        fullName: account.fullName,
      });
      localStorage.setItem(SESSION_KEY, JSON.stringify(user));
      return user;
    },

    // No email delivery in demo mode — but a signed-in user can still set
    // a password directly (used by the recovery form once signed in).
    async requestPasswordReset(): Promise<void> {
      await delay();
      throw new Error("Password reset emails aren't available in the local demo.");
    },

    async updatePassword(newPassword: string): Promise<void> {
      await delay();
      if (newPassword.length < 6) throw new Error("Password must be at least 6 characters.");
      const raw = localStorage.getItem(SESSION_KEY);
      if (!raw) throw new Error("You are not signed in.");
      let session: User;
      try {
        session = JSON.parse(raw) as User;
        if (!session?.id) throw new Error("bad session");
      } catch {
        throw new Error("You are not signed in.");
      }
      const users = loadLocalUsers();
      let account = users.find((u) => u.id === session.id);
      if (!account) {
        // Google-only account — add it to LOCAL_USERS_KEY so a password can be set
        // and email sign-in can be unlocked alongside Google.
        account = {
          id: session.id,
          email: session.email,
          name: session.name,
          salt: randomSalt(),
          passwordHash: "",
        };
        users.push(account);
      }
      const salt = randomSalt();
      const passwordHash = await hashPassword(newPassword, salt);
      localStorage.setItem(
        LOCAL_USERS_KEY,
        JSON.stringify(users.map((u) => (u.id === account.id ? { ...u, salt, passwordHash } : u))),
      );
    },

    // Email rows carry hashes; Google-linked rows don't — same rule as prod.
    async hasPassword(): Promise<boolean> {
      await delay(40);
      const raw = localStorage.getItem(SESSION_KEY);
      if (!raw) return false;
      try {
        const session = JSON.parse(raw) as User;
        if (!session?.id) return false;
        return loadLocalUsers().some((u) => u.id === session.id);
      } catch {
        return false;
      }
    },

    async signinWithGoogleAccount(account: GoogleAccount): Promise<GoogleSignInResult> {
      await delay();
      const subject = account.sub.trim();
      const email = account.email.trim();
      if (!subject || !email) throw new AuthError("That Google sign-in was invalid. Try again.");
      const normalizedEmail = email.toLowerCase();
      const stored = loadGoogleUsers();
      // Link to the existing account when this verified Google email already owns one,
      // so the user automatically lands on their existing profile (still editable).
      // Unverified emails always get a separate account to prevent impersonation.
      let id = `google-${subject}`;
      let name = "";
      let fullName = account.name.trim().slice(0, 100) || "Member";
      if (account.emailVerified === true) {
        const localMatch = loadLocalUsers().find((u) => u.email.toLowerCase() === normalizedEmail);
        const mockMatch = MOCK_USERS.find((u) => u.email.toLowerCase() === normalizedEmail);
        const googleMatch = Object.values(stored).find(
          (record) => record.email.toLowerCase() === normalizedEmail,
        );
        if (localMatch) {
          id = localMatch.id;
          name = localMatch.name;
          fullName = localMatch.fullName ?? localMatch.name;
        } else if (mockMatch) {
          id = mockMatch.id;
          name = mockMatch.name;
        } else if (googleMatch) {
          id = googleMatch.id;
          name = googleMatch.name;
        }
      }
      const known = stored[subject];
      const record = { id, email, name: known?.name ?? name, fullName };
      localStorage.setItem(GOOGLE_USERS_KEY, JSON.stringify({ ...stored, [subject]: record }));
      const user = applyOverride({ id, email, name: record.name || fullName, fullName });
      user.requiresProfileSetup =
        !loadProfiles().some((profile) => profile.id === id) &&
        !loadLocalUsers().some((entry) => entry.id === id) &&
        !MOCK_USERS.some((entry) => entry.id === id);
      localStorage.setItem(SESSION_KEY, JSON.stringify(user));
      return { user, picture: account.picture };
    },

    async signout(): Promise<void> {
      await delay(60);
      localStorage.removeItem(SESSION_KEY);
    },

    async updateName(name: string): Promise<User> {
      await delay(80);
      const clean = name.trim();
      validateUsername(clean);
      const raw = localStorage.getItem(SESSION_KEY);
      if (!raw) throw new Error("You are not signed in.");
      const session = JSON.parse(raw) as User;
      const updated: User = { ...session, name: clean, requiresProfileSetup: false };
      localStorage.setItem(SESSION_KEY, JSON.stringify(updated));
      const overrides = loadNameOverrides();
      localStorage.setItem(NAMES_KEY, JSON.stringify({ ...overrides, [session.id]: clean }));
      return updated;
    },
  };
}
