import { userFacingError } from "../utils/userFacingError";
import React, { useEffect, useState } from "react";
import { GoogleOAuthProvider, useGoogleLogin, type TokenResponse } from "@react-oauth/google";
import { ArrowLeft, ArrowRight, Eye, EyeSlash, LockKey, Sparkle } from "@phosphor-icons/react";
import { useAuth } from "../auth/authContext";
import Brand from "../components/Brand";
import { ButtonLink, Button } from "../components/Button";
import Input from "../components/Input";
import DisplayNameInput, { type DisplayNameStatus } from "../components/DisplayNameInput";
import Turnstile from "../components/Turnstile";
import { getAuthRepo, getProfileRepo } from "../data/factory";
import { getSupabase } from "../data/supabase/client";
import type { GoogleAccount } from "../data/repositories";
import { ROUTES } from "./routes";

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
const isSupabaseMode = (import.meta.env.VITE_DATA_SOURCE as string | undefined) === "supabase";
// Public Turnstile site key (Cloudflare). Empty = dev/unset: password flows
// proceed without a human-check token (Supabase must then also have CAPTCHA
// off, or every login fails server-side).
const turnstileSiteKey = (
  (import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined) ?? ""
).trim();

function GoogleMark() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" className="h-5 w-5 shrink-0">
      <path
        fill="var(--color-google-yellow)"
        d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3l5.7-5.7C34.3 6.1 29.4 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.6-.4-3.9z"
      />
      <path
        fill="var(--color-google-red)"
        d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3l5.7-5.7C34.3 6.1 29.4 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
      />
      <path
        fill="var(--color-google-green)"
        d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"
      />
      <path
        fill="var(--color-google-blue)"
        d="M43.6 20.1H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.1 5.7l6.2 5.2C36.9 39.2 44 34 44 24c0-1.3-.1-2.6-.4-3.9z"
      />
    </svg>
  );
}

function GoogleContinueButton({
  disabled,
  onAccount,
  onError,
}: {
  disabled: boolean;
  onAccount: (account: GoogleAccount) => void;
  onError: (message: string) => void;
}) {
  const login = useGoogleLogin({
    flow: "implicit",
    scope: "openid email profile",
    onSuccess: async (token: TokenResponse) => {
      try {
        const response = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
          headers: { Authorization: `Bearer ${token.access_token}` },
          signal: AbortSignal.timeout(8_000),
        });
        if (!response.ok) throw new Error("profile fetch failed");
        const info = (await response.json()) as {
          sub?: string;
          email?: string;
          name?: string;
          picture?: string;
          email_verified?: boolean;
        };
        if (!info.sub || !info.email) throw new Error("incomplete profile");
        onAccount({
          sub: info.sub,
          email: info.email,
          name: info.name ?? "",
          picture: info.picture,
          emailVerified: info.email_verified,
          accessToken: token.access_token,
        });
      } catch {
        onError("Could not read your Google profile. Try again.");
      }
    },
    onError: () => onError("Google sign-in failed. Try again."),
  });
  return (
    <Button
      variant="plain"
      type="button"
      onClick={() => login()}
      disabled={disabled}
      className="min-w-0 flex w-full items-center justify-center gap-3 rounded-2xl bg-google-button px-5 py-3.5 text-base font-semibold text-metal-highlight transition hover:bg-black disabled:opacity-60 *:min-w-0 max-w-full"
    >
      <GoogleMark />
      {disabled ? "Connecting…" : "Continue with Google"}
    </Button>
  );
}

export default function Login() {
  const { signin, signup, signinWithGoogleAccount } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [name, setName] = useState("");
  const [nameStatus, setNameStatus] = useState<DisplayNameStatus>("idle");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [googleError, setGoogleError] = useState<string | null>(null);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaRound, setCaptchaRound] = useState(0);
  const [captchaError, setCaptchaError] = useState<string | null>(null);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [resetBusy, setResetBusy] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [recoverState, setRecoverState] = useState<"idle" | "checking" | "ready" | "invalid">(
    "idle",
  );
  const [newPassword, setNewPassword] = useState("");
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setError(null);
    // Tokens are single-use: without a fresh one the server rejects the call.
    if (turnstileSiteKey && !captchaToken) {
      setError("Complete the human check first.");
      return;
    }
    if (mode === "signup" && nameStatus === "taken") {
      setError("That display name is already taken. Pick another.");
      return;
    }
    if (mode === "signup" && nameStatus === "checking") {
      setError("Checking display name availability…");
      return;
    }
    setBusy(true);
    try {
      if (mode === "signup") {
        const failure = await signup(name, email, password, captchaToken ?? undefined);
        setCaptchaToken(null);
        setCaptchaRound((r) => r + 1);
        if (failure) setError(failure);
        else window.history.replaceState({}, "", ROUTES.discover);
      } else if (await signin(email, password, captchaToken ?? undefined)) {
        setCaptchaToken(null);
        setCaptchaRound((r) => r + 1);
        window.history.replaceState({}, "", ROUTES.discover);
      } else {
        setCaptchaToken(null);
        setCaptchaRound((r) => r + 1);
        setError("That email and password don't match.");
      }
    } finally {
      setBusy(false);
    }
  };
  // Recovery landing: reset emails point here (?mode=recovery, plus the
  // session code Supabase appends). Establish the recovery session, then
  // offer the set-password form. Cleans its own URL on success.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const looksLikeRecovery =
      params.get("mode") === "recovery" || params.has("code") || hash.get("type") === "recovery";
    if (!looksLikeRecovery || !isSupabaseMode) return;
    setForgotOpen(true);
    setRecoverState("checking");
    let cancelled = false;
    void (async () => {
      try {
        const code = params.get("code");
        if (code) {
          try {
            await getSupabase().auth.exchangeCodeForSession(code);
          } catch {
            // Client may have auto-exchanged on load; fall through to check.
          }
        }
        for (let i = 0; i < 10; i++) {
          const { data } = await getSupabase().auth.getSession();
          if (cancelled) return;
          if (data.session) {
            setRecoverState("ready");
            return;
          }
          await new Promise((r) => setTimeout(r, 500));
        }
        if (!cancelled) setRecoverState("invalid");
      } catch {
        if (!cancelled) setRecoverState("invalid");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const requestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (resetBusy) return;
    setResetError(null);
    if (turnstileSiteKey && !captchaToken) {
      setResetError("Complete the human check first.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setResetError("Enter a valid email address.");
      return;
    }
    setResetBusy(true);
    try {
      await getAuthRepo().requestPasswordReset(email, captchaToken ?? undefined);
      setCaptchaToken(null);
      setCaptchaRound((r) => r + 1);
      setResetSent(true);
    } catch (err) {
      setCaptchaToken(null);
      setCaptchaRound((r) => r + 1);
      setResetError(err instanceof Error ? err.message : "Could not send reset email.");
    } finally {
      setResetBusy(false);
    }
  };

  const setRecoveryPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (resetBusy) return;
    setResetError(null);
    setResetBusy(true);
    try {
      await getAuthRepo().updatePassword(newPassword);
      setNewPassword("");
      window.history.replaceState({}, "", ROUTES.discover);
    } catch (err) {
      setResetError(err instanceof Error ? err.message : "Could not set password.");
    } finally {
      setResetBusy(false);
    }
  };

  const closeRecovery = () => {
    setForgotOpen(false);
    setResetSent(false);
    setResetError(null);
    setRecoverState("idle");
    setNewPassword("");
    window.history.replaceState({}, "", ROUTES.signin);
  };
  const supabaseGoogle = async () => {
    setGoogleBusy(true);
    setGoogleError(null);
    try {
      const { error } = await getSupabase().auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}${ROUTES.discover}` },
      });
      if (error) throw error;
    } catch (e) {
      setGoogleError(e instanceof Error ? e.message : "Google sign-in failed. Try again.");
      setGoogleBusy(false);
    }
  };
  const onGoogleAccount = async (account: GoogleAccount) => {
    setGoogleBusy(true);
    setGoogleError(null);
    const result = await signinWithGoogleAccount(account);
    if (!result.ok || !result.user) {
      setGoogleError(result.error ?? "Google sign-in failed. Try again.");
      setGoogleBusy(false);
      return;
    }
    try {
      await getProfileRepo().ensureUserProfile(result.user);
    } catch {
      // Non-fatal: the profile syncs on the next app load.
    }
    window.history.replaceState({}, "", ROUTES.discover);
  };

  return (
    <div className="min-w-0 relative grid *:min-w-0 min-h-screen place-items-center px-5 py-14 max-w-full">
      <ButtonLink
        variant="plain"
        href={ROUTES.home}
        className="min-w-0 absolute left-5 top-6 flex items-center gap-2 font-black sm:left-10 *:min-w-0 max-w-full"
      >
        <ArrowLeft size={20} weight="bold" />
        Home
      </ButtonLink>
      <Sparkle
        size={90}
        weight="duotone"
        className="absolute -right-5 top-16 rotate-12 text-accent"
        aria-hidden="true"
      />
      <div className="w-full max-w-md">
        <div className="mb-7 text-center">
          <Brand className="mb-6" />
          <h1 className="mt-2 text-3xl font-black">Sign in to CodeCanvas</h1>
          <p className="mt-2 text-muted">
            Discover creations and connect with the CodeCanvas community.
          </p>
        </div>
        <div className="toon-card toon-paper rounded-2xl bg-surface p-4 pt-10 sm:p-7 sm:p-9 sm:pt-11">
          <div className="min-w-0 mb-6 flex items-center justify-between *:min-w-0 max-w-full">
            <h2 className="text-2xl font-black">
              {mode === "signup" ? "Create account" : "Sign in"}
            </h2>
            <LockKey size={25} weight="duotone" className="text-primary" />
          </div>
          <div
            className="min-w-0 mb-5 flex flex-wrap gap-2 *:min-w-0 max-w-full"
            role="tablist"
            aria-label="Sign in or create account"
          >
            {(["signin", "signup"] as const).map((tab) => (
              <Button
                variant="filter"
                key={tab}
                role="tab"
                aria-selected={mode === tab}
                onClick={() => {
                  setMode(tab);
                  setError(null);
                }}
                className="flex-1 bg-surface"
              >
                {tab === "signin" ? "Sign in" : "Create account"}
              </Button>
            ))}
          </div>
          <form onSubmit={submit} className="space-y-5">
            {mode === "signup" && (
              <label className="block">
                <span className="mb-2 block text-xs font-black uppercase">Display name</span>
                <DisplayNameInput
                  value={name}
                  profileId=""
                  currentName=""
                  onStatusChange={setNameStatus}
                  onChange={(e) => setName(e.target.value)}
                  type="text"
                  autoComplete="nickname"
                  maxLength={40}
                  placeholder="what should we call you?"
                  required
                />
              </label>
            )}
            <label className="block">
              <span className="mb-2 block text-xs font-black uppercase">Email address</span>
              <Input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                autoComplete="off"
                placeholder="name@example.com"
                required
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-xs font-black uppercase">Password</span>
              <span className="relative block">
                <Input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  minLength={mode === "signup" ? 8 : undefined}
                  placeholder={mode === "signup" ? "at least 8 characters" : "********"}
                  className="pr-12"
                  required
                />
                <Button
                  variant="plain"
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted hover:text-foreground"
                >
                  {showPassword ? (
                    <EyeSlash size={21} weight="bold" />
                  ) : (
                    <Eye size={21} weight="bold" />
                  )}
                </Button>
              </span>
            </label>
            {turnstileSiteKey && (
              <div>
                <Turnstile
                  key={captchaRound}
                  siteKey={turnstileSiteKey}
                  onToken={setCaptchaToken}
                  onUnavailable={setCaptchaError}
                />
                {captchaError && (
                  <p role="alert" className="mt-2 text-center text-sm font-bold">
                    {userFacingError(captchaError)}
                  </p>
                )}
              </div>
            )}
            {error && (
              <p
                role="alert"
                className="rounded-xl border-[3px] border-outline bg-accent/50 px-4 py-3 text-sm font-bold"
              >
                {userFacingError(error)}
              </p>
            )}
            <Button
              type="submit"
              fullWidth
              disabled={
                busy || (mode === "signup" && (nameStatus === "taken" || nameStatus === "checking"))
              }
            >
              {busy ? "Please wait…" : mode === "signup" ? "Create account" : "Continue"}{" "}
              <ArrowRight size={20} weight="bold" />
            </Button>
          </form>
          <div className="mt-4">
            {isSupabaseMode ? (
              <div className="min-w-0 flex flex-col gap-2 *:min-w-0 max-w-full">
                <Button
                  variant="plain"
                  type="button"
                  onClick={() => void supabaseGoogle()}
                  disabled={googleBusy}
                  className="min-w-0 flex w-full items-center justify-center gap-3 rounded-2xl bg-google-button px-5 py-3.5 text-base font-semibold text-metal-highlight transition hover:bg-black disabled:opacity-60 *:min-w-0 max-w-full"
                >
                  <GoogleMark />
                  {googleBusy ? "Connecting…" : "Continue with Google"}
                </Button>
                {googleError && (
                  <p
                    role="alert"
                    className="w-full rounded-xl border-[3px] border-outline bg-accent/50 px-4 py-3 text-sm font-bold"
                  >
                    {userFacingError(googleError)}
                  </p>
                )}
              </div>
            ) : googleClientId ? (
              <div className="min-w-0 flex flex-col gap-2 *:min-w-0 max-w-full">
                <GoogleOAuthProvider clientId={googleClientId}>
                  <GoogleContinueButton
                    disabled={googleBusy}
                    onAccount={(account) => void onGoogleAccount(account)}
                    onError={setGoogleError}
                  />
                </GoogleOAuthProvider>
                {googleError && (
                  <p
                    role="alert"
                    className="w-full rounded-xl border-[3px] border-outline bg-accent/50 px-4 py-3 text-sm font-bold"
                  >
                    {userFacingError(googleError)}
                  </p>
                )}
              </div>
            ) : (
              <div className="rounded-2xl border-2 border-dashed border-outline bg-background p-4 text-sm leading-6">
                <span className="font-black">Google sign-in not configured.</span> To enable it,
                create a Web OAuth client ID in Google Cloud Console, add it as{" "}
                <code className="rounded bg-inverse px-1.5 py-0.5 text-xs text-inverse-foreground">
                  VITE_GOOGLE_CLIENT_ID
                </code>{" "}
                in{" "}
                <code className="rounded bg-inverse px-1.5 py-0.5 text-xs text-inverse-foreground">
                  .env
                </code>
                , then restart the dev server. See .env.example.
              </div>
            )}
          </div>
          {mode === "signin" && !forgotOpen && (
            <div className="mt-4 text-center">
              <Button
                variant="text"
                type="button"
                onClick={() => {
                  setForgotOpen(true);
                  setResetSent(false);
                  setResetError(null);
                }}
                className="text-sm font-black text-primary underline decoration-2 underline-offset-4"
              >
                Forgot password?
              </Button>
            </div>
          )}
          {(forgotOpen || recoverState !== "idle") && (
            <div className="mt-6 border-t-2 border-dashed border-divider pt-4">
              {recoverState === "ready" ? (
                <form onSubmit={setRecoveryPassword} className="space-y-4">
                  <h2 className="text-xl font-black">Choose a new password</h2>
                  <p className="text-sm font-bold text-muted">
                    This signs you in on this browser with the new password.
                  </p>
                  <label className="block">
                    <span className="mb-2 block text-xs font-black uppercase">New password</span>
                    <Input
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      minLength={6}
                      placeholder="At least 6 characters"
                      className="pr-12"
                      required
                    />
                  </label>
                  {resetError && (
                    <p
                      role="alert"
                      className="rounded-xl border-[3px] border-outline bg-accent/50 px-4 py-3 text-sm font-bold"
                    >
                      {userFacingError(resetError)}
                    </p>
                  )}
                  <Button type="submit" fullWidth disabled={resetBusy}>
                    {resetBusy ? "Saving…" : "Save new password"}
                  </Button>
                </form>
              ) : recoverState === "checking" ? (
                <p className="text-center text-sm font-bold text-muted">Checking reset link…</p>
              ) : recoverState === "invalid" ? (
                <div className="space-y-3 text-center">
                  <p role="alert" className="text-sm font-bold">
                    This reset link is invalid or expired. Request a new one below.
                  </p>
                  <Button variant="surface" size="small" type="button" onClick={closeRecovery}>
                    Back to sign in
                  </Button>
                </div>
              ) : resetSent ? (
                <div className="space-y-3 text-center">
                  <h2 className="text-xl font-black">Check your email</h2>
                  <p className="text-sm font-bold text-muted">
                    If an account uses that address, a reset link is on its way. Google-only
                    accounts can also just keep using “Continue with Google”.
                  </p>
                  <Button variant="surface" size="small" type="button" onClick={closeRecovery}>
                    Back to sign in
                  </Button>
                </div>
              ) : (
                <form onSubmit={requestReset} className="space-y-4">
                  <h2 className="text-xl font-black">Reset password</h2>
                  <label className="block">
                    <span className="mb-2 block text-xs font-black uppercase">Email address</span>
                    <Input
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      type="email"
                      autoComplete="off"
                      placeholder="name@example.com"
                      required
                    />
                  </label>
                  {resetError && (
                    <p
                      role="alert"
                      className="rounded-xl border-[3px] border-outline bg-accent/50 px-4 py-3 text-sm font-bold"
                    >
                      {userFacingError(resetError)}
                    </p>
                  )}
                  <div className="min-w-0 flex flex-wrap gap-3 *:min-w-0 max-w-full">
                    <Button variant="surface" size="small" type="button" onClick={closeRecovery}>
                      Back
                    </Button>
                    <Button type="submit" disabled={resetBusy} className="flex-1">
                      {resetBusy ? "Sending…" : "Send reset link"}
                    </Button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
