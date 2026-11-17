import AppCard from "./AppCard";
import { PostTimeProvider } from "./PostTimestamp";
import ErrorNotice from "./ErrorNotice";
import { debouncedVotes } from "../utils/debouncedVotes";
import { playVoteSound } from "../utils/sounds";
import { accountRole, canSubmitProjects } from "../data/accountRoles";
import ShareButton from "./ShareButton";
import { userFacingError } from "../utils/userFacingError";
import { AppCardsSkeleton, ProfileSkeleton } from "./Skeleton";
import React, { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ChatCircleDots,
  Heart,
  PencilSimple,
  Plus,
  RocketLaunch,
} from "@phosphor-icons/react";
import Avatar from "./Avatar";
import Input from "./Input";
import ProfilePhotoPicker from "./ProfilePhotoPicker";
import { useSheetPresence } from "./useSheetPresence";
import TrophyMark from "./TrophyMark";
import { Button } from "./Button";
import { useAuth } from "../auth/authContext";
import { getAppRepo, getProfileRepo } from "../data/factory";
import { useScrollToForm } from "../utils/scroll";
import { loadCachedProfile } from "../utils/viewerCache";
import { confirmDisplayNameChange } from "../utils/displayName";
import DisplayNameInput from "./DisplayNameInput";
import { useDisplayNameConfirmation } from "./useDisplayNameConfirmation";
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
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [voteError, setVoteError] = useState<string | null>(null);
  useEffect(
    () =>
      debouncedVotes.subscribe((update) => {
        if (update.userId !== currentUser?.id) return;
        setApps((items) =>
          items.map((app) =>
            app.id === update.appId
              ? { ...app, votes: update.votes, viewerHasVoted: update.viewerHasVoted }
              : app,
          ),
        );
        if (update.error) setVoteError(update.error);
      }),
    [currentUser?.id],
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const editingRef = useRef(false);
  editingRef.current = editing;
  const [fullName, setFullName] = useState(initialProfile?.fullName ?? initialProfile?.name ?? "");
  const [name, setName] = useState(initialProfile?.name ?? "");
  const [bio, setBio] = useState(initialProfile?.bio ?? "");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [editingPhoto, setEditingPhoto] = useState(false);
  const photoSheet = useSheetPresence(editingPhoto);
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
          setFullName(p.fullName ?? p.name);
          setBio(p.bio);
        }
        setApps(
          all
            .filter((a) =>
              a.creatorId ? a.creatorId === p.id : a.creator.toLowerCase() === p.name.toLowerCase(),
            )
            .map((app) => debouncedVotes.project(app, currentUser?.id)),
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
        { name: nextName, fullName, bio },
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
      // Push photo/bio changes to shared surfaces (sidebar, comment
      // avatars), which otherwise keep the old profile until a reload.
      if (normalizePathname(window.location.pathname).startsWith(`${ROUTES.developers}/`)) {
        window.history.replaceState({}, "", developerProfilePath(updated.name));
      }
      onProfileUpdated?.(updated);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Could not save profile.");
    } finally {
      setSaving(false);
    }
  };

  if (loading && !profile) return <ProfileSkeleton />;
  if (!profile) {
    return (
      <div className="toon-card toon-paper bg-panel p-10 text-center">
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

  return (
    <div className="@container/content min-w-0 max-w-full wrap-anywhere motion-safe:animate-content-in">
      <Button variant="surface" size="small" onClick={onBack}>
        <ArrowLeft size={18} weight="bold" /> Back to developers
      </Button>

      <div className="toon-card toon-paper bg-panel mt-5 p-6 pt-10 sm:p-8 sm:pt-12">
        <div className="min-w-0 flex flex-col items-center gap-5 text-center sm:flex-row sm:items-start sm:text-left max-w-full">
          <div className="relative shrink-0">
            <Avatar name={profile.name} imageUrl={profile.imageUrl} size="xl" />
            {isSelf && (
              <Button
                variant="icon"
                size="compact-icon"
                type="button"
                aria-label="Edit profile picture"
                aria-expanded={editingPhoto}
                aria-controls="profile-photo-editor"
                disabled={saving}
                aria-haspopup="dialog"
                onClick={() => setEditingPhoto(true)}
                className="absolute bottom-0 right-0 h-10 w-10 text-foreground"
              >
                <PencilSimple size={20} weight="bold" aria-hidden="true" />
              </Button>
            )}
          </div>
          <div className="w-full min-w-0 flex-1 sm:w-auto">
            <p className="min-w-0 inline-flex -rotate-2 items-center gap-2 border-2 border-dashed border-primary px-3 py-1 text-xs font-black uppercase text-primary bg-surface max-w-full">
              {isSelf ? "Your profile" : "Developer"}
            </p>
            <h2 className="mt-3 flex min-w-0 max-w-full flex-wrap items-center justify-center gap-2 text-3xl font-black sm:justify-start">
              <span className="min-w-0 max-w-full wrap-anywhere">
                {profile.fullName || profile.name}
              </span>
              {trophies.get(profile.id) !== undefined && (
                <TrophyMark minimal place={trophies.get(profile.id) as 1 | 2 | 3} size={32} />
              )}
            </h2>
            <p className="mt-1 break-words font-bold text-muted">@{profile.name}</p>
            <p className="mt-1 font-bold text-muted">{accountRole(profile.role)}</p>
            {profile.bio && (
              <p className="mt-3 max-w-2xl break-words leading-7 text-body">{profile.bio}</p>
            )}
            {!loading && !error && (
              <div className="min-w-0 mt-4 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm font-black sm:justify-start max-w-full">
                <span>
                  {apps.length} project{apps.length === 1 ? "" : "s"}
                </span>
                <span className="min-w-0 flex items-center gap-1 max-w-full">
                  <Heart size={16} weight="duotone" /> {totalVotes} likes received
                </span>
                <span className="min-w-0 flex items-center gap-1 max-w-full">
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
            <ShareButton profile={profile} variant="surface" className="w-full sm:w-auto" />
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

        {isSelf && photoSheet.present && (
          <ProfilePhotoPicker
            exiting={photoSheet.closing}
            name={profile.name}
            imageUrl={profile.imageUrl}
            onClose={() => setEditingPhoto(false)}
            onSave={async (imageUrl) => {
              if (!currentUser) return;
              const updated = await getProfileRepo().updateProfile(
                profile.id,
                { imageUrl },
                currentUser.id,
              );
              setProfile(updated);
              updateCachedProfile(updated);
              onProfileUpdated?.(updated);
              setEditingPhoto(false);
            }}
          />
        )}

        {isSelf && editing && (
          <form
            ref={editFormRef}
            onSubmit={(e) => void save(e)}
            className="min-w-0 mt-6 grid scroll-mt-28 gap-4 border-t-2 border-dashed border-divider pt-6 @min-[36rem]/content:grid-cols-2 max-w-full"
          >
            {confirmationModal}
            <label>
              <span className="mb-2 block text-sm font-black">Full name</span>
              <Input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                autoComplete="name"
                maxLength={100}
                placeholder="e.g. Alex Reyes"
                required
              />
            </label>
            <label>
              <span className="mb-2 block text-xs font-black uppercase">Username</span>
              <DisplayNameInput
                profileId={profile.id}
                currentName={profile.name}
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={40}
                required
                placeholder="e.g. alexreyes"
              />
            </label>
            <label className="@min-[36rem]/content:col-span-2">
              <span className="mb-2 block text-xs font-black uppercase">Bio (280 chars)</span>
              <Input
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                maxLength={280}
                placeholder="What do you build?"
              />
            </label>
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
        {isSelf && canSubmitProjects(profile) && apps.length > 0 && (
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
        <PostTimeProvider>
          <div className="discovery-grid min-w-0 max-w-full">
            {apps.map((app) => (
              <AppCard
                key={app.id}
                app={app}
                user={currentUser}
                voted={Boolean(app.viewerHasVoted)}
                onVote={() => {
                  if (!currentUser) return;
                  debouncedVotes.toggle(app, currentUser.id, (liked) =>
                    getAppRepo().setVote(app.id, currentUser.id, liked),
                  );
                  playVoteSound();
                }}
                expanded={expandedId === app.id}
                onToggle={(id) => setExpandedId((current) => (current === id ? null : id))}
                onCommentAdded={(id, count) =>
                  setApps((items) =>
                    items.map((item) => (item.id === id ? { ...item, comments: count } : item)),
                  )
                }
                profiles={profiles}
                trophies={trophies}
                projectRanks={projectTrophies}
                onOpenProfile={onOpenProfile}
                onOpenApp={onOpenApp}
              />
            ))}
          </div>
        </PostTimeProvider>
      ) : (
        <div className="toon-card toon-paper bg-panel p-10 text-center">
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
              ? canSubmitProjects(profile)
                ? "Share your first build with the community. Your projects and their feedback will appear here."
                : "You can browse and post in the feed. An admin must approve your account as a Member before you can submit projects."
              : "Check back soon."}
          </p>
          {isSelf && canSubmitProjects(profile) && (
            <Button className="mt-5" onClick={onSubmitProject}>
              <Plus size={18} weight="bold" /> Submit project
            </Button>
          )}
        </div>
      )}
      {voteError && <ErrorNotice message={voteError} onDismiss={() => setVoteError(null)} />}
    </div>
  );
}
