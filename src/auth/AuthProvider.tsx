import { authContext } from "./authContext";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { getAuthRepo, getProfileRepo } from "../data/factory";
import { NotFoundError, type GoogleAccount } from "../data/repositories";
import GoogleProfileSetup from "./GoogleProfileSetup";
import { Button } from "../components/Button";
import StartupReady from "../components/StartupReady";
import type { Appearance, Profile, User } from "../data/types";
import { cacheProfile, loadCachedProfile, setActiveViewer } from "../utils/viewerCache";
import { initializePalette, resolvePalette, setPalette } from "../utils/palette";
import { debouncedFeedVotes, debouncedVotes } from "../utils/debouncedVotes";
import { loadAppearance, setAppearance } from "../utils/appearance";
import { createDebouncedTheme, type ThemePatch } from "../utils/debouncedTheme";

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [appearanceSaving, setAppearanceSaving] = useState(false);
  const confirmedProfile = useRef<Profile | null>(null);
  const themeBaseline = useRef<{ appearance: Appearance; palette: string } | null>(null);
  const themeSaverRef = useRef<ReturnType<typeof createDebouncedTheme> | null>(null);
  if (!themeSaverRef.current) {
    themeSaverRef.current = createDebouncedTheme((id, patch) =>
      getProfileRepo().updateProfile(id, patch, id),
    );
  }
  const themeSaver = themeSaverRef.current;
  const [setupState, setSetupState] = useState<"ready" | "checking" | "required" | "error">(
    "ready",
  );
  const userRef = useRef<User | null>(null);
  const sessionRevision = useRef(0);
  const profileRevision = useRef(0);
  const profileRequest = useRef<{ user: User; promise: Promise<void> } | null>(null);
  const sessionRequest = useRef<{ revision: number; promise: Promise<User | null> } | null>(null);

  const changeSession = useCallback(
    (session: User | null) => {
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
        themeSaver.cancel();
        themeBaseline.current = null;
        setAppearanceSaving(false);
        debouncedVotes.cancelUser(previousId);
        debouncedFeedVotes.cancelUser(previousId);
      }
      profileRevision.current++;
      userRef.current = session;
      setActiveViewer(session?.id ?? null);
      const cached = session ? loadCachedProfile(session.id) : null;
      confirmedProfile.current = cached;
      setProfile(cached);
      setSetupState(session?.requiresProfileSetup ? "checking" : "ready");
      initializePalette();
      if (cached?.palette) setPalette(resolvePalette(cached.palette));
      if (cached?.appearance) setAppearance(cached.appearance);
      setUser(session);
    },
    [themeSaver],
  );

  const updateCachedProfile = useCallback(
    (next: Profile) => {
      if (next.id !== userRef.current?.id) return;
      profileRevision.current++;
      confirmedProfile.current = next;
      cacheProfile(next);
      const preview = { ...next, ...themeSaver.pending() };
      setProfile(preview);
      setPalette(resolvePalette(preview.palette));
      if (preview.appearance) setAppearance(preview.appearance);
    },
    [themeSaver],
  );

  const updateTheme = useCallback(
    async (patch: ThemePatch) => {
      const current = userRef.current;
      const previous = themeBaseline.current ?? {
        appearance: loadAppearance(),
        palette: resolvePalette(),
      };
      if (patch.appearance) setAppearance(patch.appearance);
      if (patch.palette) setPalette(patch.palette);
      if (!current) return;
      if (!themeSaver.hasPending()) themeBaseline.current = previous;
      setAppearanceSaving(true);
      profileRevision.current++;
      const pending = themeSaver.schedule(current.id, patch);
      setProfile((value) => (value ? { ...value, ...patch } : value));
      try {
        const next = await pending;
        if (next && userRef.current?.id === current.id) updateCachedProfile(next);
      } catch (error) {
        if (userRef.current?.id === current.id) {
          const saved = confirmedProfile.current;
          const preview = {
            appearance: saved?.appearance ?? previous.appearance,
            palette: saved?.palette ?? previous.palette,
            ...themeSaver.pending(),
          };
          setPalette(resolvePalette(preview.palette));
          setAppearance(preview.appearance);
          if (saved) setProfile({ ...saved, ...themeSaver.pending() });
        }
        throw error;
      } finally {
        setAppearanceSaving(themeSaver.hasPending());
        if (!themeSaver.hasPending()) themeBaseline.current = null;
      }
    },
    [themeSaver, updateCachedProfile],
  );

  const updateAppearance = useCallback(
    (appearance: Appearance) => updateTheme({ appearance }),
    [updateTheme],
  );
  const updatePalette = useCallback((palette: string) => updateTheme({ palette }), [updateTheme]);

  useEffect(() => () => themeSaver.cancel(), [themeSaver]);

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
    const repo = getAuthRepo();
    const checkSession = () => {
      // Share restoration/revalidation across simultaneous events and StrictMode effects.
      if (!sessionRequest.current) {
        const request = Promise.resolve().then(() => repo.getSession());
        sessionRequest.current = { revision: sessionRevision.current, promise: request };
        const clear = () => {
          if (sessionRequest.current?.promise === request) sessionRequest.current = null;
        };
        void request.then(clear, clear);
      }
      const { revision, promise } = sessionRequest.current;
      return promise
        .then((session) => {
          if (!cancelled && sessionRevision.current === revision) changeSession(session);
        })
        .catch(() => {
          // A failed background check (e.g. offline) is not proof of sign-out.
          if (!cancelled && sessionRevision.current === revision && !userRef.current)
            changeSession(null);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    };
    const revalidate = () => {
      if (userRef.current) void checkSession();
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") revalidate();
    };
    const onNavigate = (event: MouseEvent) => {
      // Store tabs also use pushState without emitting popstate.
      const anchor = event.target instanceof Element ? event.target.closest("a[href]") : null;
      if (anchor instanceof HTMLAnchorElement && anchor.origin === window.location.origin)
        revalidate();
    };
    const unsubscribe = repo.subscribeSession?.((session) => {
      if (cancelled) return;
      changeSession(session);
      setLoading(false);
    });
    void checkSession();
    window.addEventListener("focus", revalidate);
    window.addEventListener("popstate", revalidate);
    window.addEventListener("storage", revalidate);
    document.addEventListener("visibilitychange", onVisible);
    document.addEventListener("click", onNavigate, true);
    return () => {
      cancelled = true;
      unsubscribe?.();
      window.removeEventListener("focus", revalidate);
      window.removeEventListener("popstate", revalidate);
      window.removeEventListener("storage", revalidate);
      document.removeEventListener("visibilitychange", onVisible);
      document.removeEventListener("click", onNavigate, true);
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
        updateAppearance,
        updatePalette,
        appearanceSaving,
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
