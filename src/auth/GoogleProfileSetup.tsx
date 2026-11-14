import { useState } from "react";
import { ArrowRight, Check, Sparkle } from "@phosphor-icons/react";
import Brand from "../components/Brand";
import Avatar from "../components/Avatar";
import StartupReady from "../components/StartupReady";
import { Button } from "../components/Button";
import Input from "../components/Input";
import DisplayNameInput, { type DisplayNameStatus } from "../components/DisplayNameInput";
import { validateFullName } from "../utils/fullName";
import { isValidUsername, validateUsername } from "../utils/username";
import { userFacingError } from "../utils/userFacingError";

export default function GoogleProfileSetup({
  initialName,
  profileId,
  email,
  onComplete,
  onSignout,
}: {
  initialName: string;
  profileId: string;
  email: string;
  onComplete: (fullName: string, username: string) => Promise<void>;
  onSignout: () => Promise<void>;
}) {
  const [fullName, setFullName] = useState(initialName);
  const [username, setUsername] = useState("");
  const [status, setStatus] = useState<DisplayNameStatus>("idle");
  const [busy, setBusy] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy || leaving || status === "checking" || status === "taken") return;
    setBusy(true);
    setError(null);
    try {
      await onComplete(validateFullName(fullName), validateUsername(username));
    } catch (err) {
      setError(userFacingError(err instanceof Error ? err.message : "Could not save profile."));
    } finally {
      setBusy(false);
    }
  };
  const switchAccount = async () => {
    setLeaving(true);
    setError(null);
    try {
      await onSignout();
    } catch {
      setError("Could not sign out. Try again.");
    } finally {
      setLeaving(false);
    }
  };
  return (
    <main className="grid min-h-screen place-items-center px-5 py-10 sm:py-14">
      <StartupReady />
      <div className="w-full max-w-xl">
        <Brand className="mb-7" />
        <ol
          aria-label="Account setup progress"
          className="mb-6 grid grid-cols-2 gap-3 text-sm font-black"
        >
          <li className="flex items-center gap-2 rounded-2xl border-2 border-outline bg-secondary px-3 py-3">
            <Check size={20} weight="bold" aria-hidden="true" /> Google connected
          </li>
          <li
            aria-current="step"
            className="flex items-center gap-2 rounded-2xl border-2 border-outline bg-primary px-3 py-3 text-primary-foreground"
          >
            <span className="grid size-6 shrink-0 place-items-center rounded-full border-2 border-current text-xs">
              2
            </span>{" "}
            Your profile
          </li>
        </ol>
        <section
          aria-labelledby="onboarding-heading"
          className="toon-card toon-paper bg-surface p-5 sm:p-8"
        >
          <div className="mb-6">
            <Sparkle size={32} weight="duotone" className="mb-3 text-primary" aria-hidden="true" />
            <p className="text-xs font-black uppercase tracking-widest text-muted">
              Welcome to CodeCanvas
            </p>
            <h1 id="onboarding-heading" className="mt-2 text-3xl font-black">
              Complete your profile
            </h1>
            <p className="mt-3 leading-6 text-muted">
              Your Google account is connected. Confirm your name and choose how the community will
              find you.
            </p>
          </div>
          <div className="mb-6 flex items-center gap-3 rounded-2xl border-2 border-dashed border-divider p-4">
            <Avatar name={fullName.trim() || "You"} color="mint" />
            <div className="min-w-0">
              <p className="break-words font-black">{fullName.trim() || "Your full name"}</p>
              <p className="break-words text-sm font-bold text-primary">
                @{username.trim() || "your-username"}
              </p>
              <p className="mt-1 text-xs text-muted">
                Your public profile · you can edit this later
              </p>
            </div>
          </div>
          <form onSubmit={(event) => void submit(event)} className="space-y-5" aria-busy={busy}>
            <fieldset disabled={busy || leaving} className="space-y-5">
              <label className="block">
                <span className="mb-2 block text-sm font-black">Full name</span>
                <Input
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  autoComplete="name"
                  autoFocus={!initialName}
                  maxLength={100}
                  required
                />
                <span className="mt-2 block text-xs text-muted">
                  Your name, as you’d like it to appear on your profile.
                </span>
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-black">Username</span>
                <DisplayNameInput
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  profileId={profileId}
                  currentName=""
                  onStatusChange={setStatus}
                  autoComplete="username"
                  autoFocus={!!initialName}
                  showStatus
                  placeholder="e.g. alexreyes"
                  required
                />
              </label>
            </fieldset>
            {error && (
              <p role="alert" className="text-sm font-bold">
                {error}
              </p>
            )}
            <Button
              type="submit"
              fullWidth
              disabled={
                busy ||
                leaving ||
                status === "checking" ||
                status === "taken" ||
                !isValidUsername(username.trim()) ||
                !fullName.trim()
              }
            >
              {busy ? "Creating your profile…" : "Finish setup"}
              <ArrowRight size={20} weight="bold" aria-hidden="true" />
            </Button>
          </form>
        </section>
        <div className="mt-6 text-center text-sm text-muted">
          <p className="break-words">
            Connected as <span className="font-bold">{email}</span>
          </p>
          <Button
            variant="text"
            disabled={busy || leaving}
            onClick={() => void switchAccount()}
            className="mt-2 text-sm font-black"
          >
            {leaving ? "Signing out…" : "Use a different account"}
          </Button>
        </div>
      </div>
    </main>
  );
}
