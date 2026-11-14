import { authContext } from "./authContext";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { getAuthRepo, getProfileRepo } from "../data/factory";
import { NotFoundError, type GoogleAccount } from "../data/repositories";
import GoogleProfileSetup from "./GoogleProfileSetup";
import { Button } from "../components/Button";
import StartupReady from "../components/StartupReady";
import type { Profile, User } from "../data/types";
import { cacheProfile, loadCachedProfile, setActiveViewer } from "../utils/viewerCache";
import { initializePalette, resolvePalette, setPalette } from "../utils/palette";
import { debouncedFeedVotes, debouncedVotes } from "../utils/debouncedVotes";

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [setupState, setSetupState] = useState<"ready" | "checking" | "required" | "error">(
    "ready",
  );
  const userRef = useRef<User | null>(null);
  const sessionRevision = useRef(0);
  const profileRevision = useRef(0);
  const profileRequest = useRef<{ user: User; promise: Promise<void> } | null>(null);

  const changeSession = useCallback((session: User | null) => {
    sessionRevision.current++;
    const previous = userRef.current;
    if (
      previous &&
      session &&
      previous.id === session.id &&
      previous.email === session.email &&
      previous.name === session.name &&
      previous.requiresProfileSetup === session.requiresProfileSetup
    ) {
      // Token refreshes must not reset cached presentation or pending edits.
      return;
    }
    const previousId = userRef.current?.id;
    if (previousId && previousId !== session?.id) {
      debouncedVotes.cancelUser(previousId);
      debouncedFeedVotes.cancelUser(previousId);
    }
    profileRevision.current++;
    userRef.current = session;
    setActiveViewer(session?.id ?? null);
    const cached = session ? loadCachedProfile(session.id) : null;
    setProfile(cached);
    setSetupState(session?.requiresProfileSetup ? "checking" : "ready");
    initializePalette();
    if (cached?.palette) setPalette(resolvePalette(cached.palette));
    setUser(session);
  }, []);

  const updateCachedProfile = useCallback((next: Profile) => {
    if (next.id !== userRef.current?.id) return;
    profileRevision.current++;
    cacheProfile(next);
    setProfile(next);
    setPalette(resolvePalette(next.palette));
  }, []);

  const refreshProfile = useCallback(async () => {
    const current = userRef.current;
    if (!current) return;
    if (profileRequest.current?.user === current) return profileRequest.current.promise;
    const revision = profileRevision.current;
    const repo = getProfileRepo();
    const promise = (
      current.requiresProfileSetup
        ? repo.getProfile(current.id).then(() => repo.ensureUserProfile(current))
        : repo.ensureUserProfile(current)
    )
      .then((next) => {
        // Ignore old sessions and responses superseded by a profile edit.
        if (userRef.current === current && profileRevision.current === revision) {
          updateCachedProfile(next);
          setSetupState("ready");
        }
      })
      .catch((error) => {
        if (
          current.requiresProfileSetup &&
          userRef.current === current &&
          profileRevision.current === revision
        ) {
          setSetupState(error instanceof NotFoundError ? "required" : "error");
          return;
        }
        throw error;
      });
    profileRequest.current = { user: current, promise };
    try {
      await promise;
    } finally {
      if (profileRequest.current?.promise === promise) profileRequest.current = null;
    }
  }, [updateCachedProfile]);

  useEffect(() => {
    if (user)
      void refreshProfile().catch(() => {
        // Keep cached display data when a background refresh fails.
      });
  }, [user, refreshProfile]);

  // Restore session via repo so a future HTTP backend needs no UI change.
  useEffect(() => {
    let cancelled = false;
    const revision = sessionRevision.current;
    const repo = getAuthRepo();
    const unsubscribe = repo.subscribeSession?.((session) => {
      if (cancelled) return;
      changeSession(session);
      setLoading(false);
    });
    repo
      .getSession()
      .then((session) => {
        if (!cancelled && sessionRevision.current === revision) changeSession(session);
      })
      .catch(() => {
        if (!cancelled && sessionRevision.current === revision) changeSession(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [changeSession]);

  const signin = async (email: string, password: string, captchaToken?: string) => {
    try {
      const session = await getAuthRepo().signin(email, password, captchaToken);
      changeSession(session);
      return true;
    } catch {
      return false;
    }
  };

  // Returns an error message on failure, null on success.
  const signup = async (
    name: string,
    email: string,
    password: string,
    captchaToken?: string,
    fullName?: string,
  ) => {
    try {
      const session = await getAuthRepo().signup(name, email, password, captchaToken, fullName);
      changeSession(session);
      return null;
    } catch (e) {
      return e instanceof Error ? e.message : "Could not create your account.";
    }
  };

  const signinWithGoogleAccount = async (account: GoogleAccount) => {
    try {
      const { user: session, picture } = await getAuthRepo().signinWithGoogleAccount(account);
      changeSession(session);
      return { ok: true as const, user: session, picture };
    } catch (e) {
      return {
        ok: false as const,
        error: e instanceof Error ? e.message : "Google sign-in failed.",
      };
    }
  };

  const signout = async () => {
    if (userRef.current) {
      debouncedVotes.cancelUser(userRef.current.id);
      debouncedFeedVotes.cancelUser(userRef.current.id);
    }
    try {
      await getAuthRepo().signout();
    } finally {
      // Always clear locally (fail closed) even if the server call fails;
      // the server session expires on its own. Callers show their own toast.
      changeSession(null);
    }
  };

  const updateName = async (name: string) => {
    const updated = await getAuthRepo().updateName(name);
    userRef.current = updated;
    setUser(updated);
    if (profile) updateCachedProfile({ ...profile, name: updated.name });
  };

  const completeGoogleProfile = async (fullName: string, name: string) => {
    const current = userRef.current;
    if (!current) return;
    const next = { ...current, name, fullName, requiresProfileSetup: false };
    const owner = await getProfileRepo().getProfileByName(name);
    if (owner && owner.id !== current.id)
      throw new Error("That username is already taken. Try another.");
    const saved = await getProfileRepo().ensureUserProfile(next);
    const updated = await getAuthRepo().updateName(name);
    if (userRef.current?.id !== current.id) return;
    userRef.current = { ...updated, fullName, requiresProfileSetup: false };
    setUser(userRef.current);
    updateCachedProfile(saved);
    setSetupState("ready");
  };

  return (
    <authContext.Provider
      value={{
        user,
        loading,
        profile,
        refreshProfile,
        updateCachedProfile,
        signin,
        signup,
        signinWithGoogleAccount,
        signout,
        updateName,
      }}
    >
      {setupState === "required" && user ? (
        <GoogleProfileSetup
          profileId={user.id}
          email={user.email}
          initialName={user.fullName ?? user.name}
          onComplete={completeGoogleProfile}
          onSignout={signout}
        />
      ) : setupState === "checking" ? (
        <main className="grid min-h-screen place-items-center" role="status">
          Checking your profile…
        </main>
      ) : setupState === "error" ? (
        <main className="grid min-h-screen place-items-center">
          <StartupReady />
          <div className="space-y-4 text-center">
            <p role="alert">Could not load your profile. Try again.</p>
            <Button
              onClick={() => {
                setSetupState("checking");
                void refreshProfile();
              }}
            >
              Try again
            </Button>
            <Button variant="text" onClick={() => void signout()}>
              Sign out
            </Button>
          </div>
        </main>
      ) : (
        children
      )}
    </authContext.Provider>
  );
};
