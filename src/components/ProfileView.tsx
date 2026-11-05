import ProjectImage from "./ProjectImage";
import VotersDialog from "./VotersDialog";
import ShareButton from "./ShareButton";
import ProjectPlaceholder from "./ProjectPlaceholder";
import { userFacingError } from "../utils/userFacingError";
import { AppCardsSkeleton, ProfileSkeleton } from "./Skeleton";
import React, { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ChatCircleDots,
  Heart,
  Images,
  PencilSimple,
  Plus,
  RocketLaunch,
} from "@phosphor-icons/react";
import Avatar from "./Avatar";
import Input, { Select, FileInput } from "./Input";
import MentionText from "./MentionText";
import TrophyMark from "./TrophyMark";
import { Button, ButtonLabel } from "./Button";
import UploadStamp from "./UploadStamp";
import { useAuth } from "../auth/authContext";
import { getAppRepo, getProfileRepo } from "../data/factory";
import { useScrollToForm } from "../utils/scroll";
import { loadCachedProfile } from "../utils/viewerCache";
import { confirmDisplayNameChange } from "../utils/displayName";
import DisplayNameInput from "./DisplayNameInput";
import { useDisplayNameConfirmation } from "./useDisplayNameConfirmation";
import { PROFILE_THEMES } from "../data/types";
import { NotFoundError } from "../data/repositories";
import { ROUTES, developerProfilePath, normalizePathname } from "../pages/routes";
import type { AppItem, Profile, User } from "../data/types";

type RankSummary = {
  rank: number;
  points: number;
  total: number;
};

type ProfileViewProps = {
  profileId: string;
  profileName?: string;
  currentUser: User | null;
  trophies: Map<string, 1 | 2 | 3>;
  projectTrophies: Map<string, 1 | 2 | 3>;
  profiles: Map<string, Profile>;
  rankSummary?: RankSummary;
  onBack: () => void;
  onOpenApp: (appId: string) => void;
  onOpenProfile: (profileId: string) => void;
  onSubmitProject: () => void;
  /** Refresh shared profile surfaces (sidebar, comments) after a save. */
  onProfileUpdated?: (profile: Profile) => void;
};

const AVATAR_COLORS = ["pink", "yellow", "mint", "sky", "lavender", "purple"] as const;

export default function ProfileView({
  profileId,
  profileName,
  currentUser,
  trophies,
  projectTrophies,
  profiles,
  rankSummary,
  onBack,
  onOpenApp,
  onOpenProfile,
  onSubmitProject,
  onProfileUpdated,
}: ProfileViewProps) {
  const { updateName, updateCachedProfile } = useAuth();
  const { confirm, confirmationModal } = useDisplayNameConfirmation();
  const [initialProfile] = useState(() =>
    currentUser?.id === profileId ? loadCachedProfile(profileId) : null,
  );
  const [profile, setProfile] = useState<Profile | null>(initialProfile);
  const [apps, setApps] = useState<AppItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const editingRef = useRef(false);
  editingRef.current = editing;
  const [name, setName] = useState(initialProfile?.name ?? "");
  const [role, setRole] = useState(initialProfile?.role ?? "");
  const [bio, setBio] = useState(initialProfile?.bio ?? "");
  const [color, setColor] = useState<string>(initialProfile?.color ?? "sky");
  const [theme, setTheme] = useState<string>(initialProfile?.theme ?? "");
  const [imageUrl, setImageUrl] = useState(initialProfile?.imageUrl ?? "");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const editFormRef = useRef<HTMLFormElement>(null);
  useScrollToForm(editing, editFormRef);

  const isSelf = currentUser ? (profile?.id ?? profileId) === currentUser.id : false;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const repo = getProfileRepo();
        let p: Profile;
        if (profileName) {
          // Keep previously shared ID URLs working while publishing username URLs.
          const named = await repo.getProfileByName(profileName);
          p = named ?? (await repo.getProfile(profileName));
          if (p.name.trim().toLowerCase() !== profileName.trim().toLowerCase() && named)
            throw new NotFoundError("Developer not found.");
        } else {
          p =
            profileId === "__me__" && currentUser
              ? await repo.ensureUserProfile(currentUser)
              : await repo.getProfile(profileId);
        }
        // Self-heal: ensure the signed-in user always has a row.
        if (currentUser && p.id !== currentUser.id) {
          await repo.ensureUserProfile(currentUser).catch(() => undefined);
        }
        const all = await getAppRepo().listApps({ limit: 200, userId: currentUser?.id });
        if (cancelled) return;
        if (normalizePathname(window.location.pathname).startsWith(`${ROUTES.developers}/`)) {
          window.history.replaceState({}, "", developerProfilePath(p.name));
        }
        setProfile(p);
        if (p.id === currentUser?.id) updateCachedProfile(p);
        if (!editingRef.current) {
          setName(p.name);
          setRole(p.role);
          setBio(p.bio);
          setColor(p.color);
          setTheme(p.theme ?? "");
          setImageUrl(p.imageUrl ?? "");
        }
        setApps(
          all.filter((a) =>
            a.creatorId ? a.creatorId === p.id : a.creator.toLowerCase() === p.name.toLowerCase(),
          ),
        );
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Could not load profile.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [profileId, profileName, currentUser]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !currentUser || saving) return;
    setSaving(true);
    setSaveError(null);
    const previousName = profile.name;
    const nextName = name.trim();
    try {
      if (!(await confirmDisplayNameChange(getProfileRepo(), profile, nextName, confirm))) return;
      const updated = await getProfileRepo().updateProfile(
        profile.id,
        { name: nextName, role, bio, color, imageUrl, theme },
        currentUser.id,
      );
      // Keep the sign-in session in sync so the new name survives reloads
      // and shows up in the sidebar immediately.
      if (isSelf && nextName !== currentUser.name) {
        try {
          await updateName(nextName);
        } catch {
          // Roll the profile back so the two never diverge.
          await getProfileRepo()
            .updateProfile(profile.id, { name: previousName }, currentUser.id)
            .catch(() => undefined);
          throw new Error("Could not update sign-in name. Try again.");
        }
      }
      setProfile(updated);
      if (isSelf) updateCachedProfile(updated);
      setEditing(false);
      // Push color/photo/bio changes to shared surfaces (sidebar, comment
      // avatars), which otherwise keep the old profile until a reload.
      if (normalizePathname(window.location.pathname).startsWith(`${ROUTES.developers}/`)) {
        window.history.replaceState({}, "", developerProfilePath(updated.name));
      }
      onProfileUpdated?.(updated);
    } catch (e) {
      setTheme(profile.theme ?? "");
      setSaveError(e instanceof Error ? e.message : "Could not save profile.");
    } finally {
      setSaving(false);
    }
  };

  if (loading && !profile) return <ProfileSkeleton />;
  if (!profile) {
    return (
      <div className="toon-card toon-paper bg-panel rounded-2xl p-10 text-center">
        <h3 className="text-xl font-black">Developer not found</h3>
        <p className="font-bold text-muted">
          {error ? userFacingError(error) : "This profile does not exist."}
        </p>
        <Button variant="secondary" className="mt-5" onClick={onBack}>
          <ArrowLeft size={18} weight="bold" /> Back
        </Button>
      </div>
    );
  }

  const totalVotes = apps.reduce((n, a) => n + a.votes, 0);
  const totalFeedback = apps.reduce((n, a) => n + a.comments, 0);
  // Allowlisted theme only — never renders raw stored values into styles.
  const previewTheme = editing ? theme : profile.theme;
  const pageTheme = (PROFILE_THEMES as readonly string[]).includes(previewTheme ?? "")
    ? previewTheme
    : undefined;

  return (
    <div className="@container/content min-w-0 max-w-full wrap-anywhere motion-safe:animate-content-in">
      <Button variant="surface" size="small" onClick={onBack}>
        <ArrowLeft size={18} weight="bold" /> Back to developers
      </Button>

      <div
        className="toon-card toon-paper bg-panel mt-5 rounded-2xl p-6 pt-10 sm:p-8 sm:pt-12"
        style={
          pageTheme
            ? {
                backgroundColor: `color-mix(in srgb, var(--color-${pageTheme}) 24%, var(--color-panel))`,
              }
            : undefined
        }
      >
        <div className="min-w-0 flex flex-col items-center gap-5 text-center sm:flex-row sm:items-start sm:text-left *:min-w-0 max-w-full">
          <Avatar name={profile.name} color={profile.color} imageUrl={profile.imageUrl} size="xl" />
          <div className="w-full min-w-0 flex-1 sm:w-auto">
            <p className="min-w-0 inline-flex -rotate-2 items-center gap-2 border-2 border-dashed border-primary px-3 py-1 text-xs font-black uppercase text-primary bg-surface *:min-w-0 max-w-full">
              {isSelf ? "Your profile" : "Developer"}
            </p>
            <h2 className="mt-3 flex min-w-0 max-w-full flex-wrap items-center justify-center gap-2 text-3xl font-black sm:justify-start *:min-w-0">
              <span className="min-w-0 max-w-full wrap-anywhere">{profile.name}</span>
              {trophies.get(profile.id) !== undefined && (
                <TrophyMark minimal place={trophies.get(profile.id) as 1 | 2 | 3} size={32} />
              )}
            </h2>
            <p className="mt-1 font-bold text-muted">{profile.role}</p>
            {profile.bio && (
              <p className="mt-3 max-w-2xl break-words leading-7 text-body">{profile.bio}</p>
            )}
            {!loading && !error && (
              <div className="min-w-0 mt-4 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm font-black sm:justify-start *:min-w-0 max-w-full">
                <span>
                  {apps.length} project{apps.length === 1 ? "" : "s"}
                </span>
                <span className="min-w-0 flex items-center gap-1 *:min-w-0 max-w-full">
                  <Heart size={16} weight="duotone" /> {totalVotes} likes received
                </span>
                <span className="min-w-0 flex items-center gap-1 *:min-w-0 max-w-full">
                  <ChatCircleDots size={16} weight="duotone" /> {totalFeedback} feedback
                </span>
              </div>
            )}
            {rankSummary && (
              <p className="mt-4 rounded-xl border-2 border-dashed border-divider p-3 text-sm font-bold text-muted">
                Ranked #{rankSummary.rank} of {rankSummary.total} · {rankSummary.points}{" "}
                {rankSummary.points === 1 ? "pt" : "pts"} — points are likes earned across all
                shared projects.
              </p>
            )}
          </div>
          <div className="flex w-full flex-wrap justify-center gap-2 sm:w-auto">
            <ShareButton profile={profile} />
            {isSelf && (
              <Button
                variant="secondary"
                size="small"
                onClick={() => setEditing((v) => !v)}
                className="w-full sm:w-auto"
              >
                <PencilSimple size={18} weight="bold" /> {editing ? "Close" : "Edit profile"}
              </Button>
            )}
          </div>
        </div>

        {isSelf && editing && (
          <form
            ref={editFormRef}
            onSubmit={(e) => void save(e)}
            className="min-w-0 mt-6 grid *:min-w-0 scroll-mt-28 gap-4 border-t-2 border-dashed border-divider pt-6 @min-[36rem]/content:grid-cols-2 max-w-full"
          >
            {confirmationModal}
            <label>
              <span className="mb-2 block text-xs font-black uppercase">Display name</span>
              <DisplayNameInput
                profileId={profile.id}
                currentName={profile.name}
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={40}
                required
                placeholder="e.g. Alex Reyes"
              />
            </label>
            <label>
              <span className="mb-2 block text-xs font-black uppercase">Role</span>
              <Input
                value={role}
                onChange={(e) => setRole(e.target.value)}
                maxLength={80}
                required
                placeholder="e.g. Frontend development"
              />
            </label>
            <label>
              <span className="mb-2 block text-xs font-black uppercase">Avatar color</span>
              <Select value={color} onChange={(e) => setColor(e.target.value)}>
                {AVATAR_COLORS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            </label>
            <div className="@min-[36rem]/content:col-span-2">
              <span className="mb-2 block text-xs font-black uppercase">
                Profile theme (profile page only)
              </span>
              <div
                className="min-w-0 flex flex-wrap items-center gap-2 *:min-w-0 max-w-full"
                role="group"
                aria-label="Profile theme"
              >
                <Button
                  variant="plain"
                  type="button"
                  onClick={() => setTheme("")}
                  aria-pressed={theme === ""}
                  title="Default"
                  className={`rounded-full border-2 px-3 py-1 text-xs font-black ${theme === "" ? "border-outline bg-secondary shadow-[2px_2px_0_var(--color-outline)]" : "border-divider bg-surface"}`}
                >
                  Default
                </Button>
                {PROFILE_THEMES.map((c) => (
                  <Button
                    variant="text"
                    key={c}
                    type="button"
                    onClick={() => setTheme(c)}
                    aria-pressed={theme === c}
                    title={c}
                    aria-label={`Profile theme ${c}`}
                    style={{ backgroundColor: `var(--color-${c})` }}
                    className={`h-8 w-8 rounded-full border-2 ${theme === c ? "border-outline shadow-[2px_2px_0_var(--color-outline)]" : "border-divider"}`}
                  />
                ))}
              </div>
            </div>
            <label className="@min-[36rem]/content:col-span-2">
              <span className="mb-2 block text-xs font-black uppercase">Bio (280 chars)</span>
              <Input
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                maxLength={280}
                placeholder="What do you build?"
              />
            </label>
            <label className="@min-[36rem]/content:col-span-2">
              <span className="mb-2 block text-xs font-black uppercase">Profile photo</span>
              <span className="min-w-0 flex flex-wrap items-center gap-3 *:min-w-0 max-w-full">
                <ButtonLabel variant="surface" size="small" className="cursor-pointer">
                  <Images size={18} weight="duotone" />
                  {photoBusy ? "Processing…" : "Choose from gallery"}
                  <FileInput
                    accept="image/*"
                    disabled={photoBusy || saving}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      e.target.value = "";
                      if (!file) return;
                      setPhotoBusy(true);
                      setSaveError(null);
                      import("../utils/images")
                        .then(({ fileToThumbnailDataUrl }) => fileToThumbnailDataUrl(file, 256))
                        .then((dataUrl) => setImageUrl(dataUrl))
                        .catch((err) =>
                          setSaveError(
                            err instanceof Error ? err.message : "Could not read photo.",
                          ),
                        )
                        .finally(() => setPhotoBusy(false));
                    }}
                  />
                </ButtonLabel>
                {imageUrl && (
                  <Button
                    variant="plain"
                    type="button"
                    onClick={() => setImageUrl("")}
                    className="text-sm font-black underline decoration-2 underline-offset-4"
                  >
                    Remove photo
                  </Button>
                )}
              </span>
              <Input
                className="mt-3"
                type="url"
                value={imageUrl.startsWith("data:") ? "" : imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="…or paste an https:// image link"
              />
            </label>
            <div className="min-w-0 flex items-center gap-3 @min-[36rem]/content:col-span-2 *:min-w-0 max-w-full">
              <Avatar
                name={name.trim() || profile.name}
                color={color}
                imageUrl={imageUrl || undefined}
                size="sm"
              />
              <span className="text-sm font-bold text-muted">
                Preview
                {imageUrl ? "" : " — avatar color applies without a photo"}
              </span>
            </div>
            {saveError && (
              <p role="alert" className="text-sm font-bold @min-[36rem]/content:col-span-2">
                {userFacingError(saveError)}
              </p>
            )}
            <Button
              size="small"
              type="submit"
              disabled={saving}
              className="@min-[36rem]/content:justify-self-start"
            >
              {saving ? "Saving…" : "Save profile"}
            </Button>
          </form>
        )}
      </div>

      <div className="mb-5 mt-8 flex flex-wrap items-center justify-between gap-4 border-t-2 border-dashed border-divider pt-6">
        <div>
          <p className="text-xs font-black uppercase text-primary">Projects</p>
          <h3 className="mt-1 text-2xl font-black">
            {isSelf ? "Your projects" : `Projects by ${profile.name}`}
          </h3>
        </div>
        {isSelf && apps.length > 0 && (
          <Button variant="secondary" size="small" onClick={onSubmitProject}>
            <Plus size={18} weight="bold" /> Submit project
          </Button>
        )}
      </div>
      {loading ? (
        <AppCardsSkeleton count={3} />
      ) : error ? (
        <p role="alert" className="font-bold text-muted">
          {userFacingError(error)}
        </p>
      ) : apps.length ? (
        <div className="min-w-0 flex flex-wrap justify-center gap-6 lg:justify-start *:min-w-0 max-w-full">
          {apps.map((app) => (
            <article
              key={app.id}
              className="app-card toon-card toon-paper bg-panel flex w-full min-w-0 max-w-sm flex-[1_1_18rem] flex-col rounded-2xl p-4 text-left *:min-w-0"
            >
              {app.screenshots?.[0] ? (
                <span className="relative block h-48 w-full shrink-0 overflow-hidden rounded-xl border-[3px] border-outline bg-inverse">
                  <ProjectImage
                    src={app.screenshots[0]}
                    alt=""
                    aria-hidden="true"
                    loading="lazy"
                    className="absolute inset-0 h-full w-full scale-110 object-cover opacity-60 blur-xl"
                  />
                  <ProjectImage
                    src={app.screenshots[0]}
                    alt={`${app.title} thumbnail`}
                    loading="lazy"
                    className="relative h-full w-full object-contain"
                  />
                </span>
              ) : (
                <ProjectPlaceholder
                  title={app.title}
                  color={app.color}
                  className="h-48 shrink-0 rounded-xl border-[3px] border-outline"
                />
              )}
              <p className="mb-3 mt-2 shrink-0 text-[10px] font-black uppercase text-primary">
                {app.category}
              </p>
              <h4 className="flex min-w-0 max-w-full shrink-0 flex-wrap items-center gap-2 text-xl font-black *:min-w-0">
                <span className="min-w-0 max-w-full line-clamp-2 wrap-anywhere" title={app.title}>
                  <Button variant="text" onClick={() => onOpenApp(app.id)}>
                    {app.title}
                  </Button>
                </span>
                {projectTrophies.get(app.id) !== undefined && (
                  <TrophyMark minimal place={projectTrophies.get(app.id) as 1 | 2 | 3} size={20} />
                )}
              </h4>
              <p className="my-4 min-h-0 line-clamp-4 flex-1 text-xs text-left text-pretty leading-6 text-muted/75">
                <MentionText
                  text={app.description}
                  mentions={app.mentions ?? []}
                  profiles={[...profiles.values()]}
                  onOpenProfile={onOpenProfile}
                />
              </p>
              <div className="min-w-0 mt-auto flex min-h-8 shrink-0 flex-wrap items-center gap-3 border-t-2 border-dashed border-divider pt-4 text-sm font-black max-w-full">
                <span className="min-w-0 flex items-center gap-1 *:min-w-0 max-w-full">
                  <Heart size={18} weight="duotone" />
                  <VotersDialog
                    appId={app.id}
                    appTitle={app.title}
                    totalVotes={app.votes}
                    onOpenProfile={onOpenProfile}
                  />
                </span>
                <span className="min-w-0 flex items-center gap-1 *:min-w-0 max-w-full">
                  <ChatCircleDots size={18} weight="duotone" /> {app.comments}
                </span>
                <ShareButton app={app} size="compact" className="ml-auto" />
              </div>
              <div className="mt-1 shrink-0">
                <UploadStamp createdAt={app.createdAt} />
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="toon-card toon-paper bg-panel rounded-2xl p-10 text-center">
          {isSelf && (
            <RocketLaunch
              size={40}
              weight="duotone"
              aria-hidden="true"
              className="mx-auto mb-4 text-primary"
            />
          )}
          <h4 className="text-xl font-black">
            {isSelf ? "You haven’t submitted a project yet" : "No projects yet"}
          </h4>
          <p className="mt-2 font-bold text-muted">
            {isSelf
              ? "Share your first build with the community. Your projects and their feedback will appear here."
              : "Check back soon."}
          </p>
          {isSelf && (
            <Button className="mt-5" onClick={onSubmitProject}>
              <Plus size={18} weight="bold" /> Submit project
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
