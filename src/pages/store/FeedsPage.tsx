import { userFacingError } from "../../utils/userFacingError";
import { FeedSkeleton } from "../../components/Skeleton";
import { CloseButton } from "../../components/CloseButton";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  ChatCircleDots,
  Heart,
  LinkSimple,
  MagnifyingGlass,
  Newspaper,
  PaperPlaneTilt,
  X,
} from "@phosphor-icons/react";
import DeleteMenu from "../../components/DeleteMenu";
import Comments from "../../components/Comments";
import VotersDialog from "../../components/VotersDialog";
import Avatar from "../../components/Avatar";
import FeedProjectPicker from "./FeedProjectPicker";
import FeedPanels from "./FeedPanels";
import FeedHighlights from "./FeedHighlights";
import { featuredProjectIds, officialAnnouncements } from "../../data/feedHighlights";
import { Button } from "../../components/Button";
import Input, { Textarea } from "../../components/Input";
import TrophyMark from "../../components/TrophyMark";
import PostTimestamp, { PostTimeProvider } from "../../components/PostTimestamp";
import type { StoreController } from "./useStoreController";
import { getAppRepo } from "../../data/factory";
import type { AppItem } from "../../data/types";
import { loadFeedProjects } from "../../utils/loadFeedProjects";

type Props = Pick<
  StoreController,
  | "cheer"
  | "cheerPending"
  | "deleteFeedPost"
  | "filteredFeedPosts"
  | "fullApps"
  | "loadFeedPosts"
  | "feedPostAppId"
  | "feedPostBody"
  | "feedPostError"
  | "feedPostSubmitting"
  | "feedPosts"
  | "feedPostsError"
  | "feedPostsLoading"
  | "feedQuery"
  | "openApp"
  | "openProfile"
  | "openThreads"
  | "postFeedPost"
  | "profilesLookup"
  | "projectTrophies"
  | "setFeedPostAppId"
  | "setFeedPostBody"
  | "setFeedQuery"
  | "toggleThread"
  | "trophies"
  | "user"
>;

export default function FeedsPage({
  cheer,
  cheerPending,
  deleteFeedPost,
  filteredFeedPosts,
  fullApps,
  loadFeedPosts,
  feedPostAppId,
  feedPostBody,
  feedPostError,
  feedPostSubmitting,
  feedPosts,
  feedPostsError,
  feedPostsLoading,
  feedQuery,
  openApp,
  openProfile,
  openThreads,
  postFeedPost,
  profilesLookup,
  projectTrophies,
  setFeedPostAppId,
  setFeedPostBody,
  setFeedQuery,
  toggleThread,
  trophies,
  user,
}: Props) {
  const projectLinkButtonRef = useRef<HTMLButtonElement>(null);
  const [projectPickerOpen, setProjectPickerOpen] = useState(false);
  const [pickerProjects, setPickerProjects] = useState<AppItem[]>([]);
  const [pickerLoading, setPickerLoading] = useState(false);
  const [pickerError, setPickerError] = useState<string | null>(null);
  const [pickerAttempt, setPickerAttempt] = useState(0);
  const availableProjects = [
    ...new Map([...pickerProjects, ...fullApps].map((app) => [app.id, app])).values(),
  ];
  const linkedProject = availableProjects.find((app) => app.id === feedPostAppId);
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({});
  const threadIds = JSON.stringify(feedPosts.map((m) => `ms:${m.id}`));
  const activeThread = feedPosts.find((m) => openThreads.has(m.id));
  const activeAuthorName = activeThread
    ? (profilesLookup.get(activeThread.authorId)?.name ?? activeThread.authorName)
    : "";
  const missingProjectIds = JSON.stringify(
    [
      ...new Set([feedPostAppId, ...featuredProjectIds, ...feedPosts.map((post) => post.appId)]),
    ].filter(
      (id): id is string => Boolean(id) && !availableProjects.some((project) => project.id === id),
    ),
  );

  useEffect(() => {
    let cancelled = false;
    const ids: string[] = JSON.parse(missingProjectIds);
    // Older linked projects may be outside the initial browse catalog after a refresh.
    void Promise.allSettled(ids.map((id) => getAppRepo().getApp(id, user?.id))).then((results) => {
      if (cancelled) return;
      const projects = results.flatMap((result) =>
        result.status === "fulfilled" ? [result.value] : [],
      );
      if (projects.length)
        setPickerProjects((current) => [
          ...new Map([...current, ...projects].map((project) => [project.id, project])).values(),
        ]);
    });
    return () => {
      cancelled = true;
    };
  }, [missingProjectIds, user?.id]);

  useEffect(() => {
    if (!projectPickerOpen) return;
    let cancelled = false;
    setPickerLoading(true);
    setPickerError(null);
    void loadFeedProjects(getAppRepo(), user?.id)
      .then((projects) => {
        if (!cancelled) setPickerProjects(projects);
      })
      .catch((error: unknown) => {
        if (!cancelled)
          setPickerError(error instanceof Error ? error.message : "Could not load projects.");
      })
      .finally(() => {
        if (!cancelled) setPickerLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [projectPickerOpen, pickerAttempt, user?.id]);

  useEffect(() => {
    if (!activeThread) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.defaultPrevented || (event.target as Element)?.closest("[data-popover-portal]"))
        return;
      if (event.key === "Escape") toggleThread(activeThread.id);
    };
    const previousOverflow = document.body.style.overflow;
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [activeThread, toggleThread]);

  useEffect(() => {
    let cancelled = false;
    const ids: string[] = JSON.parse(threadIds);
    void Promise.allSettled(
      ids.map(async (id) => {
        const comments = await getAppRepo().listComments(id);
        if (!cancelled) {
          setCommentCounts((counts) => ({ ...counts, [id]: comments.length }));
        }
      }),
    );
    return () => {
      cancelled = true;
    };
  }, [threadIds]);

  return (
    <PostTimeProvider>
      <FeedPanels
        highlights={
          <FeedHighlights
            projects={featuredProjectIds.flatMap((id) => {
              const project = availableProjects.find((app) => app.id === id);
              return project ? [project] : [];
            })}
            announcements={officialAnnouncements}
            openApp={openApp}
          />
        }
      >
        <section id="feeds" className="mx-auto w-full min-w-0 max-w-2xl scroll-mt-6">
          <div className="min-w-0">
            <form onSubmit={(e) => void postFeedPost(e)}>
              <h3 className="flex min-w-0 items-center gap-2 text-base font-black">
                <Newspaper
                  size={20}
                  weight="duotone"
                  className="shrink-0 text-primary"
                  aria-hidden="true"
                />
                Share with the community
              </h3>
              <div className="mt-2">
                <label htmlFor="feed-post-body" className="sr-only">
                  What's on your mind?
                </label>
                <Textarea
                  id="feed-post-body"
                  value={feedPostBody}
                  onChange={(e) => setFeedPostBody(e.target.value)}
                  maxLength={280}
                  showCharacterCount
                  required
                  placeholder="What's on your mind?"
                  rows={2}
                  className="min-h-16! leading-6"
                >
                  {(characterCount) => (
                    <>
                      <div className="flex min-w-0 items-center md:w-fit">
                        <Button
                          ref={projectLinkButtonRef}
                          variant="vote"
                          size="compact"
                          aria-haspopup="dialog"
                          aria-expanded={projectPickerOpen}
                          aria-controls={projectPickerOpen ? "feed-project-picker" : undefined}
                          onClick={() => setProjectPickerOpen(true)}
                          className="min-h-11"
                        >
                          <LinkSimple size={20} weight="duotone" aria-hidden="true" />
                          {linkedProject?.title ??
                            (feedPostAppId ? "Linked project" : "Link a project")}
                        </Button>
                        {feedPostAppId && (
                          <Button
                            variant="minimal"
                            size="compact-icon"
                            aria-label="Remove linked project"
                            title="Remove linked project"
                            onClick={() => {
                              setFeedPostAppId("");
                              projectLinkButtonRef.current?.focus();
                            }}
                            className="min-h-11 min-w-11 shrink-0"
                          >
                            <X size={18} weight="bold" aria-hidden="true" />
                          </Button>
                        )}
                      </div>
                      <span className="ml-auto flex min-w-0 flex-wrap items-center justify-end gap-2">
                        {characterCount}
                        <Button
                          variant="minimal"
                          size="compact"
                          type="submit"
                          disabled={feedPostSubmitting || !feedPostBody.trim()}
                          aria-label={feedPostSubmitting ? "Sending update" : "Send update"}
                          aria-busy={feedPostSubmitting}
                          title={feedPostSubmitting ? "Sending update" : "Send update"}
                          className="min-h-11 min-w-11 shrink-0"
                        >
                          <PaperPlaneTilt size={20} weight="duotone" aria-hidden="true" />
                        </Button>
                      </span>
                    </>
                  )}
                </Textarea>
              </div>
              {feedPostError && (
                <p role="alert" className="mt-3 text-sm font-bold">
                  {userFacingError(feedPostError)}
                </p>
              )}
            </form>

            <label className="relative mt-3 block">
              <span className="sr-only">Search updates</span>
              <MagnifyingGlass
                size={18}
                weight="bold"
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
                aria-hidden="true"
              />
              <Input
                type="search"
                value={feedQuery}
                onChange={(event) => setFeedQuery(event.target.value)}
                className="min-h-11 py-2! pl-9 text-base"
                placeholder="Search posts or builders..."
              />
            </label>

            {feedPostsLoading ? (
              <FeedSkeleton />
            ) : feedPostsError ? (
              <div className="toon-card mt-3 bg-surface p-4 text-center sm:p-5">
                <h3 className="text-lg font-black">Could not load the feed</h3>
                <p className="text-sm font-bold text-muted">{userFacingError(feedPostsError)}</p>
                <Button variant="secondary" onClick={() => void loadFeedPosts()} className="mt-3">
                  Retry
                </Button>
              </div>
            ) : filteredFeedPosts.length ? (
              <ul className="mt-3 space-y-2 motion-safe:[&>*:nth-child(-n+6)]:animate-content-in">
                {filteredFeedPosts.map((m) => {
                  const p = profilesLookup.get(m.authorId);
                  const linked = m.appId
                    ? availableProjects.find((a) => a.id === m.appId)
                    : undefined;
                  return (
                    <li key={m.id} className="toon-card min-w-0 bg-surface p-3 pb-1 sm:p-4 sm:pb-2">
                      <div className="flex min-w-0 items-center gap-2">
                        {p ? (
                          <Button
                            variant="plain"
                            onClick={() => openProfile(p.id)}
                            aria-label={`View ${p.name}'s profile`}
                            className="shrink-0"
                          >
                            <Avatar name={p.name} color={p.color} imageUrl={p.imageUrl} size="sm" />
                          </Button>
                        ) : (
                          <Avatar name={m.authorName} color="sky" size="sm" />
                        )}
                        <div className="flex min-w-0 flex-1 flex-col items-start gap-0.5 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-3">
                          <p className="min-w-0 max-w-full text-sm font-black leading-5 wrap-anywhere">
                            {p ? (
                              <Button variant="text" onClick={() => openProfile(p.id)}>
                                {p.name}
                              </Button>
                            ) : (
                              m.authorName
                            )}
                            {trophies.get(m.authorId) !== undefined && (
                              <TrophyMark
                                minimal
                                place={trophies.get(m.authorId) as 1 | 2 | 3}
                                size={16}
                              />
                            )}
                          </p>
                          <p className="text-xs font-bold leading-4 text-muted">
                            <PostTimestamp createdAt={m.createdAt} />
                          </p>
                        </div>
                        {user?.id === m.authorId && (
                          <DeleteMenu
                            label="Options for your update"
                            onDelete={() => deleteFeedPost(m)}
                          />
                        )}
                      </div>
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 wrap-anywhere sm:text-base">
                        {m.body}
                      </p>
                      <div className="mt-2 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 border-t-2 border-dashed border-divider pt-0.5">
                        <span className="flex min-w-0 max-w-full flex-wrap items-center gap-3">
                          <span
                            role="group"
                            aria-label="Post likes"
                            className="inline-flex min-w-0 items-center gap-1"
                          >
                            <Button
                              variant="vote"
                              onClick={() => void cheer(m)}
                              aria-pressed={Boolean(m.viewerHasCheered)}
                              disabled={!user}
                              aria-label={m.viewerHasCheered ? "Unlike post" : "Like post"}
                              className="w-fit min-h-11 shrink-0"
                            >
                              <Heart
                                size={20}
                                weight={m.viewerHasCheered ? "fill" : "duotone"}
                                aria-hidden="true"
                              />
                            </Button>
                            <VotersDialog
                              target="feedPost"
                              appId={m.id}
                              appTitle={`Update by ${p?.name ?? m.authorName}`}
                              totalVotes={m.cheers ?? 0}
                              onOpenProfile={openProfile}
                              size="default"
                            />
                          </span>
                          <Button
                            variant="vote"
                            className="w-fit min-h-11"
                            onClick={() => toggleThread(m.id)}
                            aria-expanded={openThreads.has(m.id)}
                            aria-haspopup="dialog"
                            aria-controls={`comments-ms-${m.id}`}
                            aria-label={`Show ${commentCounts[`ms:${m.id}`] ?? 0} comments`}
                          >
                            <ChatCircleDots
                              size={20}
                              weight={openThreads.has(m.id) ? "fill" : "duotone"}
                              aria-hidden="true"
                            />
                            <span className="relative top-[1.4px] leading-none">
                              {commentCounts[`ms:${m.id}`] ?? 0}
                            </span>
                          </Button>
                        </span>
                        {linked && (
                          <Button
                            variant="plain"
                            onClick={() => openApp(linked.id)}
                            className="ml-auto flex min-w-0 max-w-full items-center gap-1.5 rounded-lg border-2 border-outline bg-background px-2 py-1 text-left text-xs font-black wrap-anywhere hover:bg-secondary"
                          >
                            {linked.title}
                            {projectTrophies.get(linked.id) !== undefined && (
                              <TrophyMark
                                minimal
                                place={projectTrophies.get(linked.id) as 1 | 2 | 3}
                                size={14}
                              />
                            )}
                          </Button>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="toon-card mt-3 bg-panel p-4 text-center sm:p-5">
                <h3 className="text-lg font-black">
                  {feedPosts.length ? "No matching posts" : "Your feed starts here"}
                </h3>
                <p className="mt-1 text-sm font-bold text-muted">
                  {feedPosts.length
                    ? "Try a different search."
                    : "Share what youâ€™re building and start a conversation."}
                </p>
              </div>
            )}
          </div>
        </section>
      </FeedPanels>
      {projectPickerOpen && (
        <FeedProjectPicker
          projects={availableProjects}
          loading={pickerLoading}
          error={pickerError}
          onRetry={() => setPickerAttempt((attempt) => attempt + 1)}
          profiles={[...profilesLookup.values()]}
          user={user ?? null}
          selectedId={feedPostAppId}
          onSelect={setFeedPostAppId}
          onClose={() => setProjectPickerOpen(false)}
        />
      )}
      {activeThread &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`Comments for update by ${activeAuthorName}`}
            className="fixed inset-0 z-100 flex items-center justify-center overflow-y-auto bg-inverse/80 p-2 sm:p-4"
          >
            <div
              id={`comments-ms-${activeThread.id}`}
              className="toon-card my-auto flex max-h-[90dvh] min-h-0 w-full max-w-lg flex-col overflow-hidden bg-panel sm:max-h-[85dvh]"
            >
              <div className="flex min-w-0 shrink-0 items-center justify-between gap-2 border-b-[3px] border-outline bg-primary text-primary-foreground p-3 sm:p-4">
                <h4 className="min-w-0 text-sm font-black wrap-anywhere sm:text-base">
                  Feedback ({commentCounts[`ms:${activeThread.id}`] ?? 0}) &middot; Update by{" "}
                  {activeAuthorName}
                </h4>
                <CloseButton
                  type="button"
                  onClick={() => toggleThread(activeThread.id)}
                  aria-label="Close comments"
                  autoFocus
                />
              </div>
              <div className="modal-grid flex min-h-0 flex-1 flex-col">
                <Comments
                  appId={`ms:${activeThread.id}`}
                  appTitle={`Update by ${activeAuthorName}`}
                  currentUser={user ?? null}
                  profiles={profilesLookup}
                  trophies={trophies}
                  onOpenProfile={openProfile}
                  onCommentAdded={(id, count) =>
                    setCommentCounts((counts) => ({ ...counts, [id]: count }))
                  }
                  stickyForm
                />
              </div>
            </div>
          </div>,
          document.body,
        )}
    </PostTimeProvider>
  );
}
