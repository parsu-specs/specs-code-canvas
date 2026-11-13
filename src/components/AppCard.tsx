import ProjectImage from "./ProjectImage";
import { CloseButton } from "./CloseButton";
import React, { Suspense, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
  ArrowUpRight,
  ChatCircleDots,
  Heart,
  PencilSimple,
  User as UserIcon,
} from "@phosphor-icons/react";
import { lazyPage } from "../utils/lazyPage";
import { RowsSkeleton } from "./Skeleton";
import MentionText from "./MentionText";
import TrophyMark from "./TrophyMark";
import PostTimestamp from "./PostTimestamp";
import VotersDialog from "./VotersDialog";
import { profileForApp } from "../data/profileLinks";
import { PROJECT_STAGE_LABELS, type AppItem, type Profile, type User } from "../data/types";
import { isSafeHttpUrl } from "../utils/urls";
import { Button, ButtonChip, ButtonLink } from "./Button";
import ShareButton from "./ShareButton";
import ProjectPlaceholder from "./ProjectPlaceholder";

const Comments = lazyPage(() => import("./Comments"));

type AppCardProps = {
  app: AppItem;
  voted: boolean;
  onVote: (id: string) => void;
  user: User | null;
  expanded: boolean;
  onToggle: (id: string) => void;
  onCommentAdded: (appId: string, count: number) => void;
  profiles: Map<string, Profile>;
  trophies: Map<string, 1 | 2 | 3>;
  projectRanks: Map<string, number>;
  onOpenProfile: (profileId: string) => void;
  onOpenApp: (appId: string) => void;
  onEditApp: (appId: string) => void;
  priority?: boolean;
  eager?: boolean;
};

export default function AppCard({
  app,
  voted,
  onVote,
  user,
  expanded,
  onToggle,
  onCommentAdded,
  profiles,
  trophies,
  projectRanks,
  onOpenProfile,
  onOpenApp,
  onEditApp,
  priority = false,
  eager = false,
}: AppCardProps) {
  useEffect(() => {
    if (!expanded) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || (e.target as Element)?.closest("[data-popover-portal]")) return;
      if (e.key === "Escape") onToggle(app.id);
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [expanded, app.id, onToggle]);

  const panelId = `comments-${app.id}`;
  const creatorProfile = profileForApp(app, profiles);
  const creatorName = creatorProfile ? creatorProfile.name : app.creator;
  const collaborators = (app.collaborators ?? [])
    .map((id) => profiles.get(id))
    .filter((profile): profile is Profile => Boolean(profile));
  const projectRank = projectRanks.get(app.id);
  const trophyPlace =
    projectRank === 1 || projectRank === 2 || projectRank === 3 ? projectRank : undefined;
  const isOwner = user && (app.creatorId ? app.creatorId === user.id : app.creator === user.name);
  const pressPos = useRef<{ x: number; y: number } | null>(null);

  // Whole-card open: any press on the card itself opens the project, except
  // presses on inner controls (vote, comments, profiles, voters, links) and
  // text-selection drags, which keep their own behavior.
  const openFromCard = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest("button, a, input, select, textarea")) return;
    const start = pressPos.current;
    if (start && Math.hypot(e.clientX - start.x, e.clientY - start.y) > 6) return;
    onOpenApp(app.id);
  };

  return (
    <article
      onMouseDown={(e) => {
        pressPos.current = { x: e.clientX, y: e.clientY };
      }}
      onClick={openFromCard}
      className="app-card toon-card toon-paper bg-panel flex w-full min-w-0 max-w-sm flex-[1_1_18rem] cursor-pointer flex-col rounded-2xl p-3 *:min-w-0"
    >
      <Button
        variant="plain"
        onClick={() => onOpenApp(app.id)}
        aria-label={`Open ${app.title} details`}
        className="block w-full shrink-0"
      >
        {app.screenshots?.[0] ? (
          <span className="relative block h-36 w-full overflow-hidden rounded-xl border-[3px] border-outline bg-inverse">
            <ProjectImage
              src={app.screenshots[0]}
              alt={`${app.title} thumbnail`}
              loading={priority || eager ? "eager" : "lazy"}
              fetchPriority={priority ? "high" : "auto"}
              decoding="async"
              className="relative h-full w-full object-cover"
            />
          </span>
        ) : (
          <ProjectPlaceholder
            title={app.title}
            color={app.color}
            className="h-36 rounded-xl border-[3px] border-outline"
          />
        )}
      </Button>
      <div className="min-h-0 min-w-0 flex flex-1 flex-col *:min-w-0 max-w-full">
        <div className="min-w-0 mt-2 flex shrink-0 flex-col items-start max-w-full">
          <div className="flex w-full min-w-0 items-center justify-between">
            <span
              className="min-w-0 wrap-anywhere text-[10px] font-black uppercase text-primary"
              title={[app.category, app.stage && PROJECT_STAGE_LABELS[app.stage]]
                .filter(Boolean)
                .join(" · ")}
            >
              {app.category}
              {app.stage && <> · {PROJECT_STAGE_LABELS[app.stage]}</>}
            </span>
            {app.createdAt && (
              <div className="max-w-[60%] shrink-0 text-right">
                <PostTimestamp createdAt={app.createdAt} subject="project" />
              </div>
            )}
          </div>
          <div className="flex w-full min-w-0 items-center justify-between gap-2 max-w-full">
            <div className="flex min-w-0 flex-1 items-center gap-1">
              <h3
                className="min-w-0 w-fit max-w-full line-clamp-2 wrap-anywhere pr-[0.2em] text-lg font-black"
                title={app.title}
              >
                {app.title}
              </h3>
              {projectRank !== undefined &&
                (trophyPlace !== undefined ? (
                  <TrophyMark minimal place={trophyPlace} size={24} />
                ) : (
                  <ButtonChip className="ml-2 shrink-0 whitespace-nowrap" tone="muted">
                    #{projectRank} App
                  </ButtonChip>
                ))}
            </div>
            {app.version && (
              <p className="max-w-[40%] shrink-0 text-right text-xs font-bold text-muted wrap-anywhere">
                {app.version}
              </p>
            )}
          </div>
        </div>
        <div className="mt-1 shrink-0 text-xs leading-5">
          <div className="flex min-w-0 items-center gap-1 text-muted">
            <UserIcon
              size={15}
              weight="duotone"
              className="shrink-0 text-muted"
              aria-hidden="true"
            />
            <span className="min-w-0 truncate" title={creatorName}>
              {creatorProfile ? (
                <Button
                  variant="text"
                  size="compact"
                  onClick={() => onOpenProfile(creatorProfile.id)}
                  className="text-left text-muted"
                  aria-label={`View ${creatorName}'s profile`}
                >
                  {creatorName}
                </Button>
              ) : (
                <span>{creatorName}</span>
              )}
            </span>
            {collaborators.length > 0 && (
              <Button
                variant="text"
                size="compact"
                className="shrink-0 text-muted"
                onClick={() => onOpenApp(app.id)}
                title={collaborators.map((profile) => profile.name).join(", ")}
                aria-label={`View ${collaborators.length} collaborators for ${app.title}`}
              >
                +{collaborators.length}
              </Button>
            )}
          </div>
        </div>
        <p className="my-2 line-clamp-2 shrink-0 text-xs text-left text-pretty leading-5 text-muted/75">
          <MentionText
            text={app.description}
            mentions={app.mentions ?? []}
            profiles={[...profiles.values()]}
            onOpenProfile={onOpenProfile}
          />
        </p>
        <div className="min-w-0 mt-auto flex min-h-8 shrink-0 flex-wrap items-center gap-2 border-t-2 border-dashed border-divider pt-2.5 *:min-w-0 max-w-full">
          <span className="min-w-0 flex items-center gap-2 *:min-w-0 max-w-full">
            <Button
              variant="vote"
              className=""
              onClick={() => onVote(app.id)}
              aria-pressed={voted}
              aria-label={voted ? "Unlike project" : "Like project"}
            >
              <Heart size={20} weight={voted ? "fill" : "duotone"} />
            </Button>
            <VotersDialog
              appId={app.id}
              appTitle={app.title}
              totalVotes={app.votes}
              onOpenProfile={onOpenProfile}
            />
            <Button
              variant="vote"
              className=""
              onClick={() => onToggle(app.id)}
              aria-expanded={expanded}
              aria-haspopup="dialog"
              aria-controls={panelId}
            >
              <ChatCircleDots size={20} weight={expanded ? "fill" : "duotone"} />
              <span className="translate-y-[1.5px] text-xs">{app.comments}</span>
              <span className="sr-only">Show comments</span>
            </Button>
          </span>
          <span className="min-w-0 ml-auto flex items-center gap-1 *:min-w-0 max-w-full">
            <ShareButton app={app} size="compact" iconOnly variant="outline-flat" />
            {isOwner && (
              <Button
                variant="outline-flat"
                size="compact"
                className="min-h-8 min-w-8"
                onClick={() => onEditApp(app.id)}
                aria-label={`Edit ${app.title}`}
              >
                <PencilSimple size={16} weight="duotone" />
              </Button>
            )}
            {isSafeHttpUrl(app.url) && (
              <ButtonLink
                href={app.url as string}
                target="_blank"
                rel="noreferrer"
                variant="outline-flat"
                size="compact"
                className="min-h-8 shrink-0 whitespace-nowrap"
                aria-label={`Open ${app.title} in a new tab`}
              >
                Open <ArrowUpRight size={14} weight="duotone" />
              </ButtonLink>
            )}
          </span>
        </div>

        {expanded &&
          createPortal(
            <div
              role="dialog"
              aria-modal="true"
              aria-label={`Comments for ${app.title}`}
              onClick={(e) => e.stopPropagation()}
              className="min-w-0 fixed inset-0 z-100 flex items-center justify-center overflow-y-auto bg-inverse/80 p-4 max-w-full"
            >
              <div
                id={panelId}
                onClick={(e) => e.stopPropagation()}
                className="min-w-0 toon-card my-auto flex max-h-[85vh] min-h-0 w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-surface *:min-w-0"
              >
                <div className="min-w-0 flex shrink-0 items-center justify-between gap-3 border-b-[3px] border-outline p-4 *:min-w-0 max-w-full">
                  <h4 className="truncate text-lg font-black">
                    Feedback ({app.comments}) · {app.title}
                  </h4>
                  <CloseButton
                    type="button"
                    onClick={() => onToggle(app.id)}
                    aria-label="Close comments"
                    autoFocus
                  />
                </div>
                <div className="flex min-h-0 flex-1 flex-col">
                  <Suspense fallback={<RowsSkeleton label="Loading comments" />}>
                    <Comments
                      appId={app.id}
                      appTitle={app.title}
                      currentUser={user}
                      profiles={profiles}
                      trophies={trophies}
                      onOpenProfile={onOpenProfile}
                      onCommentAdded={onCommentAdded}
                      stickyForm
                    />
                  </Suspense>
                </div>
              </div>
            </div>,
            document.body,
          )}
      </div>
    </article>
  );
}
