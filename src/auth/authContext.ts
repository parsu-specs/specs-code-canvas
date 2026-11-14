import { createContext, useContext, type Context } from "react";
import type { GoogleAccount } from "../data/repositories";
import type { Profile, User } from "../data/types";

type AuthContext = {
  user: User | null;
  loading: boolean;
  profile: Profile | null;
  refreshProfile: () => Promise<void>;
  updateCachedProfile: (profile: Profile) => void;
  signin: (email: string, password: string, captchaToken?: string) => Promise<boolean>;
  signup: (
    name: string,
    email: string,
    password: string,
    captchaToken?: string,
    fullName?: string,
  ) => Promise<string | null>;
  signinWithGoogleAccount: (
    account: GoogleAccount,
  ) => Promise<{ ok: boolean; user?: User; picture?: string; error?: string }>;
  signout: () => Promise<void>;
  updateName: (name: string) => Promise<void>;
};

// Preserve identity even when this module is replaced during a dev hot update.
export const authContext: Context<AuthContext | undefined> =
  import.meta.hot?.data?.authContext ?? createContext<AuthContext | undefined>(undefined);
if (import.meta.hot?.data) import.meta.hot.data.authContext = authContext;

export function useAuth() {
  const value = useContext(authContext);
  if (!value) throw new Error("useAuth must be used within AuthProvider");
  return value;
}
