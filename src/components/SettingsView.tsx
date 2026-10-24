import { userFacingError } from "../utils/userFacingError";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  ArrowCounterClockwise,
  Eye,
  EyeSlash,
  Flask,
  LockKey,
  Palette,
  UserCircle,
} from "@phosphor-icons/react";
import { Button } from "./Button";
import Input, { Textarea } from "./Input";
import AppearanceControl from "./AppearanceControl";
import SoundControl from "./SoundControl";
import FluidTextControl from "../experiments/fluidText";
import BoldTextControl from "../experiments/boldText";
import NoBordersControl from "../experiments/noBorders";
import SoftEdgesControl from "../experiments/softEdges";
import GlassThemeControl from "../experiments/glassTheme";
import HalloweenThemeControl from "../experiments/halloweenTheme";
import { appearanceSnapshot, subscribeAppearance } from "../utils/appearance";
import { palettesForMode } from "../utils/darkPalettes";
import { loadPalette, PALETTES, resolvePalette, setPalette } from "../utils/palette";
import { getAuthRepo, getProfileRepo } from "../data/factory";
import { resetLocalData } from "../data/local/localApps";
import { useAuth } from "../auth/authContext";
import type { Profile } from "../data/types";
import { confirmDisplayNameChange } from "../utils/displayName";
import DisplayNameInput from "./DisplayNameInput";
import { useDisplayNameConfirmation } from "./useDisplayNameConfirmation";

const isLocalMode =
  ((import.meta.env.VITE_DATA_SOURCE as string | undefined) ?? "local") === "local";

function UserInfoForm({ profile, onChanged }: { profile: Profile; onChanged: () => void }) {
  const { user, updateName, updateCachedProfile } = useAuth();
  const { confirm, confirmationModal } = useDisplayNameConfirmation();
  const [name, setName] = useState(profile.name);
  const [bio, setBio] = useState(profile.bio);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const dirty = name !== profile.name || bio !== profile.bio;

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user || saving) return;
    setError(null);
    setSaved(false);
    if (!name.trim()) {
      setError("Name is required.");
      return;
    }
    setSaving(true);
    try {
      if (!(await confirmDisplayNameChange(getProfileRepo(), profile, name, confirm))) return;
      const updated = await getProfileRepo().updateProfile(
        user.id,
        { name: name.trim(), bio: bio.trim() },
        user.id,
      );
      if (updated.name !== user.name) {
        try {
          await updateName(updated.name);
        } catch {
          await getProfileRepo()
            .updateProfile(user.id, { name: profile.name }, user.id)
            .catch(() => undefined);
          throw new Error("Could not update sign-in name. Try again.");
        }
      }
      updateCachedProfile(updated);
      setName(updated.name);
      setBio(updated.bio);
      setSaved(true);
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save user info.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={save} onChange={() => setSaved(false)} className="mt-4 space-y-4">
      {confirmationModal}
      <fieldset disabled={saving} className="space-y-4">
        <label className="block">
          <span className="mb-2 block text-sm font-black">Display name</span>
          <DisplayNameInput
            profileId={profile.id}
            currentName={profile.name}
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="nickname"
            maxLength={40}
            required
          />
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-black">Bio</span>
          <Textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            maxLength={280}
            showCharacterCount
          />
        </label>
      </fieldset>
      {error && (
        <p role="alert" className="text-sm font-bold">
          {userFacingError(error)}
        </p>
      )}
      {saved && (
        <p role="status" className="text-sm font-bold">
          User info saved.
        </p>
      )}
      <Button type="submit" disabled={saving || !dirty}>
        {saving ? "Saving…" : "Save user info"}
      </Button>
    </form>
  );
}

/**
 * Device settings. Sound mute lives here (persisted per browser).
 * The demo-data reset only applies to the localStorage backend.
 */
function PasswordForm({ mode, onSaved }: { mode: "add" | "change"; onSaved: () => void }) {
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    setError(null);
    setSaving(true);
    try {
      await getAuthRepo().updatePassword(password);
      setPassword("");
      setDone(true);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save password.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={save} className="mt-4 space-y-3">
      <p className="text-sm font-bold text-muted">
        {mode === "add"
          ? "Set a password to unlock email sign-in as well — Google keeps working."
          : "Set a new password for email sign-in."}
      </p>
      <label className="block">
        <span className="sr-only">{mode === "add" ? "Choose a password" : "New password"}</span>
        <span className="relative block">
          <Input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type={show ? "text" : "password"}
            autoComplete="new-password"
            minLength={6}
            placeholder="At least 6 characters"
            className="pr-12"
            required
          />
          <Button
            variant="plain"
            type="button"
            onClick={() => setShow((v) => !v)}
            aria-label={show ? "Hide password" : "Show password"}
            aria-pressed={show}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-muted hover:text-foreground"
          >
            {show ? <EyeSlash size={21} weight="bold" /> : <Eye size={21} weight="bold" />}
          </Button>
        </span>
      </label>
      {error && (
        <p role="alert" className="text-sm font-bold">
          {userFacingError(error)}
        </p>
      )}
      {done && (
        <p role="status" className="text-sm font-bold">
          Password saved — you can now sign in with email too.
        </p>
      )}
      <Button type="submit" disabled={saving}>
        {saving ? "Saving…" : mode === "add" ? "Add password" : "Save new password"}
      </Button>
    </form>
  );
}

export default function SettingsView({
  profile,
  onChanged,
  hasPassword,
  onPasswordUpdated,
}: {
  profile: Profile | null;
  onChanged: () => void;
  /** Null while the sign-in method check is loading — form hidden meanwhile. */
  hasPassword: boolean | null;
  onPasswordUpdated: () => void;
}) {
  const { user, updateCachedProfile } = useAuth();
  const appearance = useSyncExternalStore(
    subscribeAppearance,
    appearanceSnapshot,
    () => "system:light",
  );
  const mode = appearance.endsWith(":dark") ? "dark" : "light";
  const palettes = palettesForMode(mode, PALETTES);
  const [palette, setPaletteState] = useState(() => loadPalette());
  const [paletteError, setPaletteError] = useState<string | null>(null);
  const [paletteSaving, setPaletteSaving] = useState(false);
  const paletteInFlight = useRef(false);
  const [armReset, setArmReset] = useState(false);

  // Follow the account choice when it arrives (e.g. fresh sign in on a new
  // device); otherwise keep the device choice.
  useEffect(() => {
    setPaletteState(resolvePalette(profile?.palette));
  }, [user?.id, profile?.palette]);

  const pickPalette = async (id: string) => {
    if (paletteInFlight.current || id === palette) return;
    const previous = loadPalette();
    setPalette(id);
    setPaletteState(loadPalette());
    setPaletteError(null);
    if (!user) return;
    paletteInFlight.current = true;
    setPaletteSaving(true);
    try {
      const updated = await getProfileRepo().updateProfile(user.id, { palette: id }, user.id);
      updateCachedProfile(updated);
      onChanged();
    } catch (e) {
      setPalette(previous);
      setPaletteState(previous);
      setPaletteError(e instanceof Error ? e.message : "Could not save palette.");
    } finally {
      paletteInFlight.current = false;
      setPaletteSaving(false);
    }
  };

  const resetDemo = () => {
    resetLocalData();
    window.location.reload();
  };

  return (
    <div className="space-y-6">
      <section className="toon-card toon-paper bg-panel rounded-2xl p-6 pt-10 sm:p-8 sm:pt-12">
        <div className="min-w-0 flex items-center gap-2 *:min-w-0 max-w-full">
          <UserCircle size={22} weight="duotone" aria-hidden="true" />
          <h2 className="text-2xl font-black">User info</h2>
        </div>
        <p className="mt-2 text-sm font-bold text-muted">
          Update the information shown on your public profile.
        </p>
        {profile && profile.id === user?.id ? (
          <UserInfoForm key={profile.id} profile={profile} onChanged={onChanged} />
        ) : (
          <p role="status" className="mt-4 text-sm font-bold text-muted">
            {user ? "Loading user info…" : "Sign in to edit your user info."}
          </p>
        )}
      </section>
      <section className="toon-card toon-paper bg-panel rounded-2xl p-6 pt-10 sm:p-8 sm:pt-12">
        <div className="min-w-0 flex items-center gap-2 *:min-w-0 max-w-full">
          <LockKey size={22} weight="duotone" aria-hidden="true" />
          <h2 className="text-2xl font-black">Sign-in & password</h2>
        </div>
        {hasPassword === null ? (
          <p className="mt-2 text-sm font-bold text-muted">Checking sign-in methods…</p>
        ) : (
          <PasswordForm mode={hasPassword ? "change" : "add"} onSaved={onPasswordUpdated} />
        )}
      </section>
      <section className="toon-card toon-paper bg-panel rounded-2xl p-6 pt-10 sm:p-8 sm:pt-12">
        <div className="min-w-0 flex items-center gap-2 *:min-w-0 max-w-full">
          <Palette size={22} weight="duotone" aria-hidden="true" />
          <h2 className="text-2xl font-black">Website theme</h2>
        </div>
        <h3 className="mt-4 text-base font-black">Appearance</h3>
        <p className="mt-1 text-sm font-bold text-muted">
          Choose light or dark, or follow your system. Saved on this device.
        </p>
        <AppearanceControl />
        <h3 className="mt-6 text-base font-black">
          {mode === "dark" ? "Dark palettes" : "Light palettes"}
        </h3>
        <p className="mt-2 text-sm font-bold text-muted">
          {mode === "dark"
            ? "Rich dark surfaces with carefully chosen accents."
            : "Soft paper surfaces with playful color accents."}{" "}
        </p>
        {paletteError && (
          <p role="alert" className="mt-2 text-sm font-bold">
            {userFacingError(paletteError)}
          </p>
        )}
        <div
          className="min-w-0 mt-4 grid *:min-w-0 grid-cols-[repeat(auto-fit,minmax(min(100%,16rem),1fr))] gap-3 max-w-full"
          role="group"
          aria-label="Website theme"
        >
          {palettes.map((p) => {
            const active = palette === p.id;
            return (
              <Button
                variant="plain"
                key={p.id}
                type="button"
                onClick={() => void pickPalette(p.id)}
                disabled={paletteSaving}
                aria-pressed={active}
                className={`min-w-0 flex flex-wrap items-center gap-3 rounded-xl border-[3px] p-3 text-left ${active ? "border-outline bg-secondary shadow-[3px_3px_0_var(--color-outline)]" : "border-divider bg-surface hover:bg-background"} max-w-full`}
              >
                <span
                  className="min-w-0 flex shrink-0 -space-x-1.5 *:min-w-0 max-w-full"
                  aria-hidden="true"
                >
                  {p.swatches.map((hex) => (
                    <span
                      key={hex}
                      style={{ backgroundColor: hex }}
                      className="h-6 w-6 rounded-full border-2 border-outline"
                    />
                  ))}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-black">{p.label}</span>
                  <span className="block text-xs font-bold text-muted">
                    {active ? "In use" : "Tap to apply"}
                  </span>
                </span>
              </Button>
            );
          })}
        </div>
      </section>
      <SoundControl />
      <section className="toon-card toon-paper rounded-2xl bg-panel p-6 pt-10 sm:p-8 sm:pt-12">
        <div className="min-w-0 flex items-center gap-2 *:min-w-0 max-w-full">
          <Flask size={22} weight="duotone" aria-hidden="true" />
          <h2 className="text-2xl font-black">Experimental</h2>
        </div>
        <p className="mt-1 text-sm font-bold text-muted">
          Some of these settings are experimental and may change or be removed in the future. These
          settings may also break the app or cause unexpected behavior.
        </p>
        <div className="mt-3 grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
          <FluidTextControl />
          <BoldTextControl />
          <NoBordersControl />
          <SoftEdgesControl />
          <GlassThemeControl />
          <HalloweenThemeControl />
        </div>
      </section>

      {isLocalMode && (
        <section className="toon-card toon-paper bg-panel rounded-2xl p-6 pt-10 sm:p-8 sm:pt-12">
          <div className="min-w-0 flex items-center gap-2 *:min-w-0 max-w-full">
            <ArrowCounterClockwise size={22} weight="duotone" aria-hidden="true" />
            <h2 className="text-2xl font-black">Demo data</h2>
          </div>
          <p className="mt-2 text-sm font-bold text-muted">
            Clear locally stored projects, likes, feedback, and Feed posts on this browser. Your
            account stays signed in.
          </p>
          {!armReset ? (
            <Button
              variant="surface"
              size="small"
              type="button"
              onClick={() => setArmReset(true)}
              className="mt-4"
            >
              Reset demo data
            </Button>
          ) : (
            <div role="alert" className="mt-4 rounded-xl border-2 border-dashed border-divider p-3">
              <p className="text-sm font-black">Clear all local projects and activity?</p>
              <div className="min-w-0 mt-3 flex flex-wrap gap-3 *:min-w-0 max-w-full">
                <Button variant="danger" size="small" type="button" onClick={resetDemo}>
                  Yes, reset it
                </Button>
                <Button
                  variant="surface"
                  size="small"
                  type="button"
                  onClick={() => setArmReset(false)}
                >
                  Keep it
                </Button>
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
