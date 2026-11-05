import type { AppRepo, AuthRepo, ProfileRepo } from "./repositories";
import { createAppRepo, createAuthRepo, createProfileRepo } from "@data-backend";

// VITE_DATA_SOURCE=local (default, browser localStorage) | supabase | http.
// UI must only depend on these interfaces, never on localStorage/fetch directly.
// Switching sources needs no UI edits; see docs/backends.md for what each
// source requires.

let authRepo: AuthRepo | null = null;
let appRepo: AppRepo | null = null;
let profileRepo: ProfileRepo | null = null;

export function getAuthRepo(): AuthRepo {
  if (!authRepo) authRepo = createAuthRepo();
  return authRepo;
}

export function getAppRepo(): AppRepo {
  if (!appRepo) appRepo = createAppRepo();
  return appRepo;
}

export function getProfileRepo(): ProfileRepo {
  if (!profileRepo) profileRepo = createProfileRepo();
  return profileRepo;
}
