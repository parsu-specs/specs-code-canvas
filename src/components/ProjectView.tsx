import { userFacingError } from "../utils/userFacingError";
import ErrorNotice from "./ErrorNotice";
import { debouncedVotes, VOTE_RATE_LIMIT_ENABLED } from "../utils/debouncedVotes";
import React, { useEffect, useRef, useState } from "react";

import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  BookOpenText,
  ChatCircleDots,
  Eye,
  DownloadSimple,
  Heart,
  Images,
  LinkSimple,
  PencilSimple,
  Trash,
} from "@phosphor-icons/react";
import Avatar from "./Avatar";
import ImageViewer from "./ImageViewer";
import SortableThumbnails from "./SortableThumbnails";
import CollaboratorPicker from "./CollaboratorPicker";
import Comments from "./Comments";
import MentionInput from "./MentionInput";
import MentionText from "./MentionText";
import TrophyMark from "./TrophyMark";
import MarkdownTextarea from "./MarkdownTextarea";
import PagedMarkdown from "./PagedMarkdown";
import UploadStamp from "./UploadStamp";
import VotersDialog from "./VotersDialog";
import ShareButton from "./ShareButton";
import ProjectPlaceholder from "./ProjectPlaceholder";
import { Button, ButtonLabel, ButtonLink } from "./Button";
import Input, { Select, FileInput, Checkbox } from "./Input";
import { getAppRepo, getProfileRepo } from "../data/factory";
import { profileIdForApp } from "../data/profileLinks";
import { fileToThumbnailDataUrl } from "../utils/images";
import { optimisticVote } from "../utils/optimisticVote";
import { enqueueVote } from "../utils/voteQueue";
import { formatCountdown } from "../utils/time";
import { extractMentionIds } from "../utils/mentions";
import { bumpCollabTag } from "../utils/notifications";
import { playVoteSound } from "../utils/sounds";
import { useScrollToForm } from "../utils/scroll";
import { readMarkdownFile } from "../utils/readMarkdownFile";
import {
  isGitHubRepositoryUrl,
  listGitHubMarkdownFiles,
  readGitHubMarkdownFiles,
  readGitHubReadme,
} from "../utils/readGitHubReadme";
import { isSafeHttpUrl } from "../utils/urls";
import type { AppItem, Category, Profile, User } from "../data/types";

type ProjectViewProps = {
  appId: string;
  currentUser: User | null;
  profiles: Map<string, Profile>;
  trophies: Map<string, 1 | 2 | 3>;
  projectTrophies: Map<string, 1 | 2 | 3>;
  onBack: () => void;
  onOpenProfile: (profileId: string) => void;
  onChanged: () => void;
  onDeleted: () => void;
  startEditing?: boolean;
};

function DocsSection({ text, source }: { text: string; source?: string }) {
  const download = () => {
    const blobUrl = URL.createObjectURL(new Blob([text], { type: "text/markdown;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = source === "README.md from GitHub" ? "README.md" : "documentation.md";
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
  };

  return (
    <section className="toon-card toon-paper mt-8 rounded-2xl bg-surface p-6 pt-10 sm:p-8 sm:pt-12">
      <div className="min-w-0 mb-3 flex items-center gap-2 *:min-w-0 max-w-full">
        <BookOpen size={22} weight="duotone" />
        <h3 className="text-2xl font-black">Documentation</h3>
      </div>
      <div className="min-w-0 mb-4 flex flex-wrap items-center justify-between gap-3 *:min-w-0 max-w-full">
        {source && <p className="text-xs font-black uppercase text-muted">{source}</p>}
        <Button variant="surface" size="small" type="button" onClick={download}>
          <DownloadSimple size={19} weight="bold" />
          Download documentation
        </Button>
      </div>
      <PagedMarkdown text={text} />
    </section>
  );
}

export default function ProjectView({
  appId,
  currentUser,
  profiles,
  trophies,
  projectTrophies,
  onBack,
  onOpenProfile,
  onChanged,
  onDeleted,
  startEditing = false,
}: ProjectViewProps) {
  const [app, setApp] = useState<AppItem | null>(null);
  const [developer, setDeveloper] = useState<Profile | null>(null);
  const [feedbackCount, setFeedbackCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [repositoryReadme, setRepositoryReadme] = useState<string | null>(null);
  const [readmeLoading, setReadmeLoading] = useState(false);
  const [readmeError, setReadmeError] = useState<string | null>(null);
  const [editing, setEditing] = useState(startEditing);
  const [eTitle, setETitle] = useState("");
  const [eDesc, setEDesc] = useState("");
  const [eCollabIds, setECollabIds] = useState<string[]>([]);
  const [eUrl, setEUrl] = useState("");
  const [eRepoUrl, setERepoUrl] = useState("");
  const [eCategory, setECategory] = useState<Category>("Productivity");
  const [eShots, setEShots] = useState<string[]>([]);
  const [eDocs, setEDocs] = useState("");
  const [eDocsTab, setEDocsTab] = useState<"write" | "upload" | "repository" | "preview">("write");
  const [eDocsPreviewReturnTab, setEDocsPreviewReturnTab] = useState<
    "write" | "upload" | "repository"
  >("write");
  const [eDocsFile, setEDocsFile] = useState<string | null>(null);
  const [eRepositoryFiles, setERepositoryFiles] = useState<string[]>([]);
  const [eSelectedRepositoryFiles, setESelectedRepositoryFiles] = useState<string[]>([]);
  const [eRepositoryFilesLoading, setERepositoryFilesLoading] = useState(false);
  const [eRepositoryFilesImporting, setERepositoryFilesImporting] = useState(false);
  const [eRepositoryFilesError, setERepositoryFilesError] = useState<string | null>(null);
  const eRepositoryRequest = useRef<AbortController | null>(null);
  const [eBusy, setEBusy] = useState(false);
  const [eImgError, setEImgError] = useState<string | null>(null);
  const [eSaving, setESaving] = useState(false);
  const [eError, setEError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [lightbox, setLightbox] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const fetched = await getAppRepo().getApp(appId, currentUser?.id);
        if (cancelled) return;
        setApp(debouncedVotes.project(fetched, currentUser?.id));
        setFeedbackCount(fetched.comments);
        const dev = await (async () => {
          const pid = profileIdForApp(fetched, profiles);
          if (pid) {
            try {
              return await getProfileRepo().getProfile(pid);
            } catch {
              return null;
            }
          }
          return await getProfileRepo().getProfileByName(fetched.creator);
        })();
        if (cancelled) return;
        setDeveloper(dev);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Could not load project.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [appId, currentUser?.id, profiles]);

  useEffect(() => {
    const controller = new AbortController();
    setRepositoryReadme(null);
    setReadmeError(null);

    if (!app?.url || app.docs?.trim() || !isGitHubRepositoryUrl(app.url)) {
      setReadmeLoading(false);
      return () => controller.abort();
    }

    setReadmeLoading(true);
    void readGitHubReadme(app.url, controller.signal)
      .then(setRepositoryReadme)
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) {
          setReadmeError(
            cause instanceof Error ? cause.message : "Could not load the repository README.",
          );
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setReadmeLoading(false);
      });

    return () => controller.abort();
  }, [app?.docs, app?.url]);

  const [voting, setVoting] = useState(false);
  const [voteNotice, setVoteNotice] = useState<string | null>(null);
  const voteNoticeTimer = useRef<number | null>(null);
  const votePausedUntil = useRef(0);

  const flashVoteNotice = (message: string) => {
    setVoteNotice(message);
    if (voteNoticeTimer.current !== null) window.clearTimeout(voteNoticeTimer.current);
    voteNoticeTimer.current = window.setTimeout(() => {
      setVoteNotice(null);
      voteNoticeTimer.current = null;
    }, 6000);
  };
  const editFormRef = useRef<HTMLFormElement>(null);
  useScrollToForm(editing, editFormRef);

  // Restore a server-side vote pause after a page refresh: the pause lives
  // in the database (vote_timeouts), so it must reappear without waiting for
  // the next rejected click. The server enforces it regardless.
  useEffect(() => {
    if (!VOTE_RATE_LIMIT_ENABLED) return;
    if (!currentUser) {
      votePausedUntil.current = 0;
      return;
    }
    let cancelled = false;
    void getAppRepo()
      .getVoteTimeoutSeconds()
      .then((secs) => {
        if (!cancelled && secs > 0) votePausedUntil.current = Date.now() + secs * 1000;
      })
      .catch(() => {
        // Enforcement stays server-side even if this prefetch fails.
      });
    return () => {
      cancelled = true;
    };
  }, [currentUser?.id]);

  useEffect(
    () =>
      debouncedVotes.subscribe((update) => {
        if (update.userId !== currentUser?.id || update.appId !== appId) return;
        setApp((prev) =>
          prev?.id === update.appId
            ? { ...prev, votes: update.votes, viewerHasVoted: update.viewerHasVoted }
            : prev,
        );
        setVoting(update.pending);
        if (update.error) flashVoteNotice(update.error);
        if (update.saved) onChanged();
      }),
    [appId, currentUser?.id, onChanged],
  );

  const vote = () => {
    if (!app || !currentUser) return;
    const me = currentUser;
    const targetId = app.id;
    if (!VOTE_RATE_LIMIT_ENABLED) {
      debouncedVotes.toggle(app, me.id, (liked) => getAppRepo().setVote(targetId, me.id, liked));
      playVoteSound();
      return;
    }
    setVoting(true);
    // Same shared queue as the feed cards: card and detail votes for one
    // project serialize instead of double-flipping the server.
    enqueueVote(targetId, async () => {
      const optimistic = optimisticVote(targetId);
      try {
        if (Date.now() < votePausedUntil.current) {
          const secs = await getAppRepo()
            .getVoteTimeoutSeconds()
            .catch(() => 0);
          const left = Math.max(secs, Math.ceil((votePausedUntil.current - Date.now()) / 1000));
          flashVoteNotice(`Liking is paused — ${formatCountdown(left)} left.`);
          return;
        }
        setApp((prev) => (prev ? optimistic.apply(prev) : prev));
        const updated = await getAppRepo().toggleVote(targetId, me.id);
        setApp((prev) => (prev?.id === targetId ? updated : prev));
        onChanged();
        if (updated.pauseStarted) {
          // Tripped the server's spam guard: vote rejected, server-side pause
          // started (survives refreshes; mirrored here for the countdown).
          const secs = updated.pausedSeconds ?? 0;
          votePausedUntil.current = Date.now() + (secs > 0 ? secs * 1000 : 5 * 60_000);
          flashVoteNotice(
            `Spamming detected — liking is paused for ${formatCountdown(secs > 0 ? secs : 300)}.`,
          );
        } else {
          playVoteSound();
        }
      } catch (e) {
        setApp((prev) => (prev ? optimistic.revert(prev) : prev));
        const message = e instanceof Error ? e.message : "Could not like. Try again.";
        if (/paus|slow down/i.test(message)) {
          const secs = await getAppRepo()
            .getVoteTimeoutSeconds()
            .catch(() => 0);
          const windowMs = secs > 0 ? secs * 1000 : 5 * 60_000;
          votePausedUntil.current = Date.now() + windowMs;
          flashVoteNotice(secs > 0 ? `Liking is paused — ${formatCountdown(secs)} left.` : message);
        } else {
          flashVoteNotice(message);
        }
      } finally {
        setVoting(false);
      }
    });
  };

  const isOwner =
    currentUser &&
    app &&
    (app.creatorId ? app.creatorId === currentUser.id : app.creator === currentUser.name);

  const beginEdit = () => {
    if (!app) return;
    setETitle(app.title);
    setEDesc(app.description);
    setECollabIds(app.collaborators ?? []);
    setEUrl(app.url ?? "");
    setERepoUrl(app.repoUrl ?? "");
    setECategory(app.category);
    setEShots(app.screenshots ?? []);
    setEDocs(app.docs ?? "");
    setEDocsTab("write");
    setEDocsPreviewReturnTab("write");
    setEDocsFile(null);
    setERepositoryFiles([]);
    setESelectedRepositoryFiles([]);
    setERepositoryFilesLoading(false);
    setERepositoryFilesImporting(false);
    setERepositoryFilesError(null);
    setEError(null);
    setConfirmDelete(false);
    setEditing(true);
  };

  // Docs import source: the repo link, falling back to the app link for
  // older projects that stored a GitHub URL there.
  const eDocsRepoUrl = eRepoUrl.trim() || (isGitHubRepositoryUrl(eUrl) ? eUrl.trim() : "");

  const eResetRepositoryFiles = () => {
    eRepositoryRequest.current?.abort();
    setERepositoryFiles([]);
    setESelectedRepositoryFiles([]);
    setERepositoryFilesLoading(false);
    setERepositoryFilesImporting(false);
    setERepositoryFilesError(null);
  };

  const eLoadRepositoryFiles = async () => {
    if (!isGitHubRepositoryUrl(eDocsRepoUrl)) {
      setERepositoryFilesError("Enter a public GitHub repository URL in the repo link first.");
      return;
    }
    eRepositoryRequest.current?.abort();
    const controller = new AbortController();
    eRepositoryRequest.current = controller;
    setERepositoryFilesLoading(true);
    setERepositoryFilesError(null);
    setERepositoryFiles([]);
    setESelectedRepositoryFiles([]);
    try {
      const paths = await listGitHubMarkdownFiles(eDocsRepoUrl, controller.signal);
      if (controller.signal.aborted) return;
      setERepositoryFiles(paths);
      const readme = paths.find((path) => /^readme\.md$/i.test(path));
      if (readme) setESelectedRepositoryFiles([readme]);
      if (!paths.length)
        setERepositoryFilesError("No Markdown files were found in this repository.");
    } catch (cause) {
      if (!controller.signal.aborted) {
        setERepositoryFilesError(
          cause instanceof Error ? cause.message : "Could not list repository Markdown files.",
        );
      }
    } finally {
      if (!controller.signal.aborted) setERepositoryFilesLoading(false);
    }
  };

  const eImportRepositoryFiles = async () => {
    if (!eSelectedRepositoryFiles.length || eRepositoryFilesImporting) return;
    eRepositoryRequest.current?.abort();
    const controller = new AbortController();
    eRepositoryRequest.current = controller;
    setERepositoryFilesImporting(true);
    setERepositoryFilesError(null);
    try {
      const files = await readGitHubMarkdownFiles(
        eDocsRepoUrl,
        eSelectedRepositoryFiles,
        controller.signal,
      );
      if (controller.signal.aborted) return;
      const combined = files.map(({ path, text }) => `# ${path}\n\n${text}`).join("\n\n---\n\n");
      setEDocs(combined);
      setEDocsFile(
        files.length === 1 ? files[0].path : `${files.length} repository Markdown files`,
      );
      setEDocsPreviewReturnTab("repository");
      setEDocsTab("preview");
      setEError(null);
    } catch (cause) {
      if (!controller.signal.aborted) {
        setERepositoryFilesError(
          cause instanceof Error ? cause.message : "Could not import repository Markdown files.",
        );
      }
    } finally {
      if (!controller.signal.aborted) setERepositoryFilesImporting(false);
    }
  };

  const deleteProject = async () => {
    if (!app || !currentUser || deleting) return;
    setDeleting(true);
    setEError(null);
    try {
      await getAppRepo().deleteApp(app.id, currentUser);
      onDeleted();
    } catch (err) {
      setEError(err instanceof Error ? err.message : "Could not delete project.");
    } finally {
      setDeleting(false);
    }
  };

  const pickShots = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setEBusy(true);
    setEImgError(null);
    try {
      const room = 3 - eShots.length;
      const chosen = Array.from(files).slice(0, Math.max(0, room));
      const compressed = await Promise.all(chosen.map((f) => fileToThumbnailDataUrl(f)));
      setEShots((prev) => [...prev, ...compressed].slice(0, 3));
    } catch (e) {
      setEImgError(e instanceof Error ? e.message : "Could not read those images.");
    } finally {
      setEBusy(false);
    }
  };

  const saveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!app || !currentUser || eSaving || eBusy) return;
    setESaving(true);
    setEError(null);
    try {
      const before = new Set(app.collaborators ?? []);
      const nextCollaborators = [
        ...new Set([...eCollabIds, ...extractMentionIds(eDesc, [...profiles.values()])]),
      ];
      const updated = await getAppRepo().updateApp(app.id, currentUser, {
        title: eTitle,
        description: eDesc,
        url: eUrl,
        repoUrl: eRepoUrl,
        category: eCategory,
        screenshots: eShots,
        docs: eDocs,
        collaborators: nextCollaborators,
      });
      setApp(updated);
      setEditing(false);
      onChanged();
      // Re-arm newly added tags so the tagged developers notify as new —
      // including re-adds after a removal (their stored snapshot may predate
      // the untag if they never loaded the app mid-gap).
      for (const id of nextCollaborators) {
        if (!before.has(id) && id !== currentUser.id) bumpCollabTag(id, app.id);
      }
    } catch (err) {
      setEError(err instanceof Error ? err.message : "Could not save changes.");
    } finally {
      setESaving(false);
    }
  };

  if (loading) return <p className="font-bold text-muted">Loading project…</p>;
  if (error || !app) {
    return (
      <div className="toon-card toon-paper bg-panel rounded-2xl p-10 text-center">
        <h3 className="text-xl font-black">Project not found</h3>
        <p className="font-bold text-muted">
          {error ? userFacingError(error) : "This project does not exist."}
        </p>
        <Button variant="secondary" className="mt-5" onClick={onBack}>
          <ArrowLeft size={18} weight="bold" /> Back
        </Button>
      </div>
    );
  }

  const cover = app.screenshots?.[0];
  const rest = (app.screenshots ?? []).slice(1);

  return (
    <div className="@container/content min-w-0 max-w-full wrap-anywhere">
      <Button variant="surface" size="small" onClick={onBack}>
        <ArrowLeft size={18} weight="bold" /> Go Back
      </Button>

      <div className="mt-5">
        {cover ? (
          <Button
            variant="plain"
            type="button"
            onClick={() => setLightbox(0)}
            aria-label={`View ${app.title} cover full size`}
            className="block w-full cursor-zoom-in rounded-2xl toon-card"
          >
            <span className="relative block h-80 w-full overflow-hidden md:h-96 rounded-xl">
              <img
                src={cover}
                alt={`${app.title} thumbnail`}
                loading="lazy"
                className="relative h-full w-full object-cover"
              />
            </span>
          </Button>
        ) : (
          <ProjectPlaceholder
            title={app.title}
            color={app.color}
            className="h-48 border-b-[3px] border-outline"
            letterClassName="text-6xl"
          />
        )}
        <div className="p-8 lg:py-8 lg:px-2">
          <div className="min-w-0 flex flex-wrap items-start justify-between gap-4 *:min-w-0 max-w-full">
            <p className="min-w-0 inline-flex -rotate-2 items-center gap-2 border-2 border-dashed border-primary px-3 py-1 text-xs font-black uppercase text-primary bg-surface *:min-w-0 max-w-full">
              {app.category}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <ShareButton app={app} />
              {isOwner && !editing && (
                <Button variant="secondary" size="small" onClick={beginEdit}>
                  <PencilSimple size={18} weight="bold" /> Edit project
                </Button>
              )}
            </div>
          </div>
          <h2 className="mt-4 flex min-w-0 max-w-full flex-wrap items-center gap-2 text-3xl font-black sm:text-4xl *:min-w-0">
            <span className="min-w-0 max-w-full wrap-anywhere">{app.title}</span>
            {projectTrophies.get(app.id) !== undefined && (
              <TrophyMark minimal place={projectTrophies.get(app.id) as 1 | 2 | 3} size={30} />
            )}
          </h2>
          <div className="mt-2">
            <UploadStamp createdAt={app.createdAt} />
          </div>
          <p className="mt-3 text-lg leading-8 text-body">
            <MentionText
              text={app.description}
              mentions={app.mentions ?? []}
              profiles={[...profiles.values()]}
              onOpenProfile={onOpenProfile}
            />
          </p>
          {(() => {
            const collabs = (app.collaborators ?? [])
              .map((id) => profiles.get(id))
              .filter((p): p is Profile => Boolean(p));
            if (!collabs.length) return null;
            return (
              <p className="mt-3 max-w-3xl text-sm font-black">
                <span className="uppercase text-muted">Collaborators: </span>
                {collabs.map((p, i) => (
                  <span key={p.id}>
                    {i > 0 && <span className="text-muted">, </span>}
                    <Button
                      variant="text"
                      onClick={() => onOpenProfile(p.id)}
                      className="underline decoration-2 underline-offset-4"
                    >
                      {p.name}
                    </Button>
                  </span>
                ))}
              </p>
            );
          })()}

          <div className="min-w-0 mt-5 flex flex-wrap items-center gap-4 *:min-w-0 max-w-full">
            <Button
              variant="vote"
              onClick={() => void vote()}
              aria-pressed={Boolean(app.viewerHasVoted)}
              aria-label={app.viewerHasVoted ? "Unlike project" : "Like project"}
              disabled={!currentUser}
            >
              <Heart size={20} weight={app.viewerHasVoted ? "fill" : "duotone"} />
              {app.votes} {app.votes === 1 ? "like" : "likes"}
            </Button>
            <span className="min-w-0 flex items-center gap-1 text-sm font-black *:min-w-0 max-w-full">
              <ChatCircleDots size={20} weight="duotone" />
              {app.comments} feedback
            </span>
            <VotersDialog
              appId={app.id}
              appTitle={app.title}
              totalVotes={app.votes}
              onOpenProfile={onOpenProfile}
            />
            {isSafeHttpUrl(app.url) && (
              <ButtonLink
                href={app.url as string}
                target="_blank"
                rel="noreferrer"
                className="ml-auto"
                size="small"
              >
                Open app <ArrowRight size={16} weight="bold" />
              </ButtonLink>
            )}
          </div>

          {developer && (
            <Button
              variant="plain"
              onClick={() => onOpenProfile(developer.id)}
              className="min-w-0 mt-6 flex w-full items-center gap-4 rounded-2xl border-[3px] border-outline bg-surface p-4 text-left shadow-[3px_3px_0_var(--color-outline)] *:min-w-0 max-w-full"
            >
              <Avatar
                name={developer.name}
                color={developer.color}
                imageUrl={developer.imageUrl}
                size="md"
              />
              <span className="min-w-0 flex-1">
                <span className="block text-xs font-black uppercase text-primary">Built by</span>
                <span className="flex min-w-0 max-w-full flex-wrap items-center gap-2 text-lg font-black *:min-w-0">
                  <span className="min-w-0 max-w-full wrap-anywhere">{developer.name}</span>
                  {trophies.get(developer.id) !== undefined && (
                    <TrophyMark minimal place={trophies.get(developer.id) as 1 | 2 | 3} size={22} />
                  )}
                </span>
                <span className="block wrap-anywhere text-sm font-bold text-muted">
                  {developer.role}
                </span>
              </span>
              <ArrowRight size={20} weight="bold" className="ml-auto shrink-0" />
            </Button>
          )}
        </div>
      </div>

      {editing && (
        <form
          ref={editFormRef}
          onSubmit={(e) => void saveEdit(e)}
          className="min-w-0 toon-card toon-paper mt-8 grid *:min-w-0 scroll-mt-28 gap-5 rounded-2xl bg-info p-6 pt-10 @min-[36rem]/content:grid-cols-2 max-w-full"
        >
          <div className="@min-[36rem]/content:col-span-2">
            <PencilSimple size={32} weight="duotone" />
            <h3 className="mt-2 text-2xl font-black">Edit project</h3>
            <p className="text-body">Only you can see this form — you own this project.</p>
          </div>
          <label>
            <span className="mb-2 block text-xs font-black uppercase">Project name</span>
            <Input
              value={eTitle}
              onChange={(e) => setETitle(e.target.value)}
              required
              maxLength={80}
              placeholder="Project name"
            />
          </label>
          <label>
            <span className="mb-2 block text-xs font-black uppercase">Category</span>
            <Select value={eCategory} onChange={(e) => setECategory(e.target.value as Category)}>
              <option value="Education">Education</option>
              <option value="Productivity">Productivity</option>
              <option value="Games">Games</option>
              <option value="Creative">Creative</option>
            </Select>
          </label>
          <label className="@min-[36rem]/content:col-span-2">
            <span className="mb-2 block text-xs font-black uppercase">
              What does it do? (type @ to mention developers)
            </span>
            <MentionInput
              value={eDesc}
              onChange={setEDesc}
              profiles={[...profiles.values()]}
              required
              maxLength={280}
              placeholder="One clear sentence — @ a collaborator"
            />
          </label>
          <div className="@min-[36rem]/content:col-span-2">
            <span className="mb-2 block text-xs font-black uppercase">
              Collaborators (optional)
            </span>
            <CollaboratorPicker
              profiles={[...profiles.values()]}
              selected={eCollabIds}
              onChange={setECollabIds}
            />
          </div>
          <label className="@min-[36rem]/content:col-span-2">
            <span className="mb-2 block text-xs font-black uppercase">App link</span>
            <span className="relative block">
              <LinkSimple
                size={21}
                weight="bold"
                className="absolute left-4 top-1/2 -translate-y-1/2"
              />
              <Input
                className="pl-12"
                type="url"
                value={eUrl}
                onChange={(e) => {
                  setEUrl(e.target.value);
                  eResetRepositoryFiles();
                }}
                placeholder="https://project.example"
              />
            </span>
            <span className="mt-2 block text-xs text-body">
              The live demo or project page behind the Open app button.
            </span>
          </label>
          <label className="@min-[36rem]/content:col-span-2">
            <span className="mb-2 block text-xs font-black uppercase">
              GitHub project repo link (optional)
            </span>
            <span className="relative block">
              <LinkSimple
                size={21}
                weight="bold"
                className="absolute left-4 top-1/2 -translate-y-1/2"
              />
              <Input
                className="pl-12"
                type="url"
                value={eRepoUrl}
                onChange={(e) => {
                  setERepoUrl(e.target.value);
                  eResetRepositoryFiles();
                }}
                placeholder="https://github.com/you/project"
              />
            </span>
            <span className="mt-2 block text-xs text-body">
              Only used to import documentation. Never shown on the Open app button.
            </span>
          </label>
          <div className="@min-[36rem]/content:col-span-2">
            <span className="mb-2 block text-xs font-black uppercase">
              Thumbnails (up to 3, first is the cover)
            </span>
            <ButtonLabel variant="surface" size="small" className="cursor-pointer">
              <Images size={20} weight="duotone" />
              {eBusy ? "Processing…" : "Choose from gallery"}
              <FileInput
                accept="image/*"
                multiple
                disabled={eBusy || eShots.length >= 3}
                onChange={(e) => {
                  void pickShots(e.target.files);
                  e.target.value = "";
                }}
              />
            </ButtonLabel>
            {eImgError && (
              <p role="alert" className="mt-2 text-sm font-bold">
                {userFacingError(eImgError)}
              </p>
            )}
            {eShots.length > 0 && (
              <SortableThumbnails
                images={eShots}
                onReorder={setEShots}
                onRemove={(i) => setEShots((prev) => prev.filter((_, j) => j !== i))}
              />
            )}
          </div>
          <div className="@min-[36rem]/content:col-span-2">
            <span className="mb-2 block text-xs font-black uppercase">
              Documentation (optional, markdown supported)
            </span>
            <div className="min-w-0 mb-3 flex flex-wrap items-center gap-2 *:min-w-0 max-w-full">
              {(["write", "upload", "repository"] as const).map((tab) => (
                <Button
                  key={tab}
                  variant="outline-flat"
                  size="small"
                  type="button"
                  onClick={() => {
                    setEDocsPreviewReturnTab(tab);
                    setEDocsTab(tab);
                  }}
                  aria-pressed={eDocsTab === tab}
                  className="capitalize"
                >
                  {tab === "upload"
                    ? "Upload .md"
                    : tab === "repository"
                      ? "GitHub repository"
                      : tab}
                </Button>
              ))}
              <Button
                variant="outline-flat"
                size="small"
                type="button"
                onClick={() => {
                  if (eDocsTab === "preview") setEDocsTab(eDocsPreviewReturnTab);
                  else {
                    setEDocsPreviewReturnTab(eDocsTab);
                    setEDocsTab("preview");
                  }
                }}
                aria-pressed={eDocsTab === "preview"}
                className="ml-auto"
              >
                {eDocsTab === "preview" ? (
                  <>
                    <PencilSimple size={16} weight="bold" /> Edit
                  </>
                ) : (
                  <>
                    <Eye size={16} weight="bold" /> Preview
                  </>
                )}
              </Button>
            </div>
            {eDocsTab === "write" && (
              <MarkdownTextarea
                className="min-h-24"
                value={eDocs}
                onChange={(e) => {
                  setEDocs(e.target.value);
                  setEDocsFile(null);
                }}
                maxLength={50000}
                showCharacterCount
                placeholder={"# My project\n\nWhat it does, how to run it…"}
              />
            )}
            {eDocsTab === "upload" && (
              <div>
                <ButtonLabel variant="surface" size="small" className="cursor-pointer">
                  <BookOpenText size={20} weight="duotone" />
                  Choose README.md
                  <FileInput
                    accept=".md,.markdown,.txt,text/markdown,text/plain"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      e.target.value = "";
                      if (!file) return;
                      readMarkdownFile(file)
                        .then(({ name, text }) => {
                          setEDocs(text);
                          setEDocsFile(name);
                          setEDocsPreviewReturnTab("upload");
                          setEDocsTab("preview");
                          setEError(null);
                        })
                        .catch((err) =>
                          setEError(err instanceof Error ? err.message : "Could not read file."),
                        );
                    }}
                  />
                </ButtonLabel>
                {eDocsFile && (
                  <p className="mt-2 text-sm font-bold text-muted">
                    {eDocsFile} · {eDocs.length} chars
                  </p>
                )}
              </div>
            )}
            {eDocsTab === "repository" && (
              <div className="rounded-xl border-2 border-outline bg-surface p-4">
                {!isGitHubRepositoryUrl(eDocsRepoUrl) ? (
                  <p role="status" className="text-sm font-bold text-body">
                    Provide your GitHub project repo link first — paste it in the repo link field
                    above, then come back here to choose Markdown files.
                  </p>
                ) : (
                  <>
                    <p className="text-sm font-bold text-body">
                      Choose Markdown files from the public GitHub repository in your repo link.
                    </p>
                    <Button
                      variant="secondary"
                      size="small"
                      type="button"
                      onClick={() => void eLoadRepositoryFiles()}
                      disabled={eRepositoryFilesLoading || eRepositoryFilesImporting}
                      className="mt-3"
                    >
                      {eRepositoryFilesLoading
                        ? "Loading repository files…"
                        : "Load Markdown files"}
                    </Button>
                    {eRepositoryFilesError && (
                      <p role="alert" className="mt-3 text-sm font-bold text-foreground">
                        {userFacingError(eRepositoryFilesError)}
                      </p>
                    )}
                    {eRepositoryFiles.length > 0 && (
                      <>
                        <div className="min-w-0 mt-4 flex flex-wrap items-center justify-between gap-3 *:min-w-0 max-w-full">
                          <p className="text-sm font-black">
                            {eSelectedRepositoryFiles.length} of {eRepositoryFiles.length} selected
                          </p>
                          <label className="min-w-0 flex items-center gap-2 text-sm font-black *:min-w-0 max-w-full">
                            <Checkbox
                              checked={eSelectedRepositoryFiles.length === eRepositoryFiles.length}
                              onChange={(event) =>
                                setESelectedRepositoryFiles(
                                  event.target.checked ? eRepositoryFiles : [],
                                )
                              }
                            />
                            Select all
                          </label>
                        </div>
                        <div className="mt-2 max-h-64 space-y-1 overflow-y-auto rounded-xl border-2 border-divider p-2">
                          {eRepositoryFiles.map((path) => (
                            <label
                              key={path}
                              className="min-w-0 flex items-start gap-2 rounded-lg px-2 py-1.5 text-sm font-bold hover:bg-background *:min-w-0 max-w-full"
                            >
                              <Checkbox
                                checked={eSelectedRepositoryFiles.includes(path)}
                                onChange={(event) =>
                                  setESelectedRepositoryFiles((selected) =>
                                    event.target.checked
                                      ? [...selected, path]
                                      : selected.filter((item) => item !== path),
                                  )
                                }
                                className="mt-1 shrink-0"
                              />
                              <span className="break-all">{path}</span>
                            </label>
                          ))}
                        </div>
                        <Button
                          size="small"
                          type="button"
                          onClick={() => void eImportRepositoryFiles()}
                          disabled={!eSelectedRepositoryFiles.length || eRepositoryFilesImporting}
                          className="mt-3"
                        >
                          {eRepositoryFilesImporting
                            ? "Importing selected files…"
                            : `Use ${eSelectedRepositoryFiles.length} selected file${eSelectedRepositoryFiles.length === 1 ? "" : "s"}`}
                        </Button>
                        <p className="mt-2 text-xs font-bold text-muted">
                          Selected files are combined into project documentation (50,000-character
                          limit).
                        </p>
                      </>
                    )}
                  </>
                )}
              </div>
            )}
            {eDocsTab === "preview" && (
              <div className="rounded-2xl border-[3px] border-outline bg-surface p-4">
                {eDocs.trim() ? (
                  <PagedMarkdown text={eDocs} fadeTo="var(--color-surface)" />
                ) : (
                  <p className="text-sm font-bold text-muted">
                    Nothing to preview yet — write some markdown or upload a README.
                  </p>
                )}
              </div>
            )}
          </div>
          {eError && (
            <p role="alert" className="text-sm font-bold @min-[36rem]/content:col-span-2">
              {userFacingError(eError)}
            </p>
          )}
          <div className="min-w-0 flex flex-wrap gap-3 @min-[36rem]/content:col-span-2 *:min-w-0 max-w-full">
            <Button type="submit" disabled={eSaving || eBusy}>
              {eSaving ? "Saving…" : "Save changes"}
            </Button>
            <Button
              variant="surface"
              type="button"
              onClick={() => {
                setEditing(false);
                setEError(null);
                setConfirmDelete(false);
              }}
            >
              Cancel
            </Button>
            {!confirmDelete ? (
              <Button
                variant="surface"
                size="small"
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="ml-auto text-danger"
              >
                <Trash size={18} weight="bold" /> Delete project
              </Button>
            ) : (
              <div
                role="alert"
                className="min-w-0 flex w-full flex-wrap items-center gap-3 rounded-2xl border-[3px] border-outline bg-surface p-4 *:min-w-0 max-w-full"
              >
                <p className="w-full text-sm font-black">
                  Delete “{app.title}” forever? Its screenshots, docs, and feedback go with it. This
                  cannot be undone.
                </p>
                <Button
                  variant="danger"
                  size="small"
                  type="button"
                  onClick={() => void deleteProject()}
                  disabled={deleting}
                >
                  <Trash size={16} weight="bold" /> {deleting ? "Deleting…" : "Yes, delete it"}
                </Button>
                <Button
                  variant="secondary"
                  size="small"
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  disabled={deleting}
                >
                  Keep it
                </Button>
              </div>
            )}
          </div>
        </form>
      )}

      {rest.length > 0 && (
        <section className="mt-8">
          <div className="min-w-0 mb-4 flex items-center gap-2 *:min-w-0 max-w-full">
            <Images size={22} weight="duotone" />
            <h3 className="text-2xl font-black">Screenshots</h3>
          </div>
          <div className="min-w-0 grid *:min-w-0 grid-cols-[repeat(auto-fit,minmax(min(100%,18rem),1fr))] gap-6 max-w-full">
            {rest.map((src, i) => (
              <Button
                variant="plain"
                key={src.slice(0, 64) + i}
                type="button"
                onClick={() => setLightbox(i + 1)}
                aria-label={`View ${app.title} screenshot ${i + 1} full size`}
                className="toon-card bg-surface block w-full cursor-zoom-in overflow-hidden rounded-2xl p-0 text-left"
              >
                <span className="relative block aspect-video w-full overflow-hidden bg-inverse">
                  <img
                    src={src}
                    alt=""
                    aria-hidden="true"
                    loading="lazy"
                    className="absolute inset-0 h-full w-full scale-110 object-cover opacity-60 blur-2xl"
                  />
                  <img
                    src={src}
                    alt={`${app.title} screenshot ${i + 1}`}
                    loading="lazy"
                    className="relative h-full w-full object-contain"
                  />
                </span>
              </Button>
            ))}
          </div>
          <p className="mt-3 text-xs font-bold text-muted">
            Fixed preview box — click any image to view it full size.
          </p>
        </section>
      )}

      {lightbox !== null && (
        <ImageViewer
          title={`${app.title} screenshots`}
          images={(app.screenshots ?? []).map((src, index) => ({
            src,
            alt: `${app.title} screenshot ${index + 1}`,
          }))}
          initialIndex={lightbox}
          onClose={() => setLightbox(null)}
        />
      )}

      {voteNotice && <ErrorNotice message={voteNotice} onDismiss={() => setVoteNotice(null)} />}

      {app.docs?.trim() ? (
        <DocsSection text={app.docs} />
      ) : readmeLoading ? (
        <section
          aria-live="polite"
          className="toon-card toon-paper bg-panel mt-8 rounded-2xl p-6 pt-10 sm:p-8 sm:pt-12"
        >
          <div className="min-w-0 mb-3 flex items-center gap-2 *:min-w-0 max-w-full">
            <BookOpen size={22} weight="duotone" />
            <h3 className="text-2xl font-black">Loading repository README…</h3>
          </div>
          <p className="font-bold text-muted">Checking GitHub for README.md.</p>
        </section>
      ) : repositoryReadme ? (
        <DocsSection text={repositoryReadme} source="README.md from GitHub" />
      ) : readmeError ? (
        <section
          role="status"
          className="toon-card toon-paper bg-panel mt-8 rounded-2xl p-6 pt-10 sm:p-8 sm:pt-12"
        >
          <div className="min-w-0 mb-3 flex items-center gap-2 *:min-w-0 max-w-full">
            <BookOpen size={22} weight="duotone" />
            <h3 className="text-2xl font-black">Repository README unavailable</h3>
          </div>
          <p className="font-bold text-muted">{userFacingError(readmeError)}</p>
        </section>
      ) : app.url && isGitHubRepositoryUrl(app.url) ? (
        <section className="toon-card toon-paper bg-panel mt-8 rounded-2xl p-6 pt-10 sm:p-8 sm:pt-12">
          <div className="min-w-0 mb-3 flex items-center gap-2 *:min-w-0 max-w-full">
            <BookOpen size={22} weight="duotone" />
            <h3 className="text-2xl font-black">No repository README found</h3>
          </div>
          <p className="font-bold text-muted">
            Add custom documentation or a README.md to this public GitHub repository.
          </p>
        </section>
      ) : null}

      <section className="toon-card mt-8 rounded-2xl bg-surface p-6 sm:p-8">
        <h3 className="text-2xl font-black">Feedback ({feedbackCount})</h3>
        <div className="mt-5">
          <Comments
            appId={app.id}
            appTitle={app.title}
            currentUser={currentUser}
            profiles={profiles}
            trophies={trophies}
            onOpenProfile={onOpenProfile}
            onCommentAdded={(_id, count) => {
              setFeedbackCount(count);
              setApp((prev) => (prev ? { ...prev, comments: count } : prev));
            }}
          />
        </div>
      </section>
    </div>
  );
}
