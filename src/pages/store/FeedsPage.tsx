import { userFacingError } from "../../utils/userFacingError";
import { FeedSkeleton } from "../../components/Skeleton";
import { CloseButton } from "../../components/CloseButton";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  ChatCircleDots,
  Heart,
  LinkSimple,
  MagnifyingGlass,
  Newspaper,
  PaperPlaneTilt,
} from "@phosphor-icons/react";
import DeleteMenu from "../../components/DeleteMenu";
import Comments from "../../components/Comments";
import VotersDialog from "../../components/VotersDialog";
import Avatar from "../../components/Avatar";
import Dropdown from "../../components/Dropdown";
import { Button } from "../../components/Button";
import Input, { Textarea } from "../../components/Input";
import TrophyMark from "../../components/TrophyMark";
import PostTimestamp, { PostTimeProvider } from "../../components/PostTimestamp";
import type { StoreController } from "./useStoreController";
import { getAppRepo } from "../../data/factory";

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
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({});
  const threadIds = JSON.stringify(feedPosts.map((m) => `ms:${m.id}`));
  const activeThread = feedPosts.find((m) => openThreads.has(m.id));
  const activeAuthorName = activeThread
    ? (profilesLookup.get(activeThread.authorId)?.name ?? activeThread.authorName)
    : "";

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
      <section id="feeds" className="mx-auto max-w-4xl scroll-mt-6">
        <div className="min-w-0">
          <form onSubmit={(e) => void postFeedPost(e)} className="">
            <h3 className="min-w-0 flex items-center gap-2 text-lg font-black *:min-w-0 max-w-full">
              <Newspaper size={22} weight="duotone" className="text-primary" />
              Share with the community
            </h3>
            <div className="mt-3">
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
                rows={3}
                className="min-h-24 leading-7"
              >
                {(characterCount) => (
                  <>
                    <div className="min-w-0 md:w-fit">
                      <Dropdown
                        triggerVariant="minimal"
                        mobileIcon={<LinkSimple size={20} weight="duotone" />}
                        label="Attach one of your projects (optional)"
                        value={feedPostAppId}
                        onChange={setFeedPostAppId}
                        options={[
                          { value: "", label: "No linked project" },
                          ...(user
                            ? fullApps
                                .filter((a) =>
                                  a.creatorId ? a.creatorId === user.id : a.creator === user.name,
                                )
                                .map((a) => ({ value: a.id, label: a.title }))
                            : []),
                        ]}
                      />
                    </div>
                    <span className="ml-auto flex min-w-0 flex-wrap items-center justify-end gap-3">
                      {characterCount}
                      <Button
                        variant="minimal"
                        size="small"
                        type="submit"
                        disabled={feedPostSubmitting || !feedPostBody.trim()}
                        aria-label={feedPostSubmitting ? "Sending update" : "Send update"}
                        aria-busy={feedPostSubmitting}
                        title={feedPostSubmitting ? "Sending update" : "Send update"}
                        className="shrink-0"
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

          <label className="relative mt-4 block">
            <span className="sr-only">Search updates</span>
            <MagnifyingGlass
              size={20}
              weight="bold"
              className="absolute left-4 top-1/2 -translate-y-1/2 text-muted"
            />
            <Input
              type="search"
              value={feedQuery}
              onChange={(event) => setFeedQuery(event.target.value)}
              className="py-2.5 pl-11 text-sm"
              placeholder="Search posts or builders..."
            />
          </label>

          {feedPostsLoading ? (
            <FeedSkeleton />
          ) : feedPostsError ? (
            <div className="toon-card bg-surface mt-4 rounded-2xl p-8 text-center">
              <h3 className="text-xl font-black">Could not load the feed</h3>
              <p className="font-bold text-muted">{userFacingError(feedPostsError)}</p>
              <Button variant="secondary" onClick={() => void loadFeedPosts()} className="mt-5">
                Retry
              </Button>
            </div>
          ) : filteredFeedPosts.length ? (
            <ul className="mt-4 space-y-3 motion-safe:[&>*:nth-child(-n+6)]:animate-content-in">
              {filteredFeedPosts.map((m) => {
                const p = profilesLookup.get(m.authorId);
                const linked = m.appId ? fullApps.find((a) => a.id === m.appId) : undefined;
                return (
                  <li key={m.id} className="toon-card rounded-2xl bg-surface p-4 sm:p-5">
                    <div className="min-w-0 flex items-center gap-3 *:min-w-0 max-w-full">
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
                      <div className="min-w-0 flex flex-row gap-4 items-center justify-between w-full md:justify-start">
                        <p className="text-sm font-black w-fit">
                          {p ? (
                            <Button variant="text" onClick={() => openProfile(p.id)} className="">
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
                        <p className="text-xs font-bold text-muted">
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
                    <p className="mt-3 leading-7">{m.body}</p>
                    <div className="min-w-0 mt-4 flex min-h-8 flex-wrap items-center gap-3 border-t-2 border-dashed border-divider pt-4 *:min-w-0 max-w-full">
                      <span className="min-w-0 flex items-center gap-2 *:min-w-0 max-w-full">
                        <Button
                          variant="vote"
                          onClick={() => void cheer(m)}
                          aria-pressed={Boolean(m.viewerHasCheered)}
                          disabled={!user}
                          aria-label={m.viewerHasCheered ? "Unlike post" : "Like post"}
                        >
                          <Heart size={20} weight={m.viewerHasCheered ? "fill" : "duotone"} />
                        </Button>
                        <VotersDialog
                          target="feedPost"
                          appId={m.id}
                          appTitle={`Update by ${p?.name ?? m.authorName}`}
                          totalVotes={m.cheers ?? 0}
                          onOpenProfile={openProfile}
                        />
                        <Button
                          variant="vote"
                          onClick={() => toggleThread(m.id)}
                          aria-expanded={openThreads.has(m.id)}
                          aria-haspopup="dialog"
                          aria-controls={`comments-ms-${m.id}`}
                        >
                          <ChatCircleDots
                            size={20}
                            weight={openThreads.has(m.id) ? "fill" : "duotone"}
                          />
                          {commentCounts[`ms:${m.id}`] ?? 0}
                          <span className="sr-only">Show comments</span>
                        </Button>
                      </span>
                      {linked && (
                        <Button
                          variant="plain"
                          onClick={() => openApp(linked.id)}
                          className="ml-auto rounded-lg border-2 border-outline bg-background px-2.5 py-1 text-xs font-black hover:bg-secondary"
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
            <div className="toon-card toon-paper bg-panel mt-6 rounded-2xl p-10 text-center">
              <h3 className="text-xl font-black">
                {feedPosts.length ? "No matching posts" : "Your feed starts here"}
              </h3>
              <p className="font-bold text-muted">
                {feedPosts.length
                  ? "Try a different search."
                  : "Share what youâ€™re building and start a conversation."}
              </p>
            </div>
          )}
        </div>
      </section>
      {activeThread &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`Comments for update by ${activeAuthorName}`}
            className="min-w-0 fixed inset-0 z-100 flex items-center justify-center overflow-y-auto bg-inverse/80 p-4 max-w-full"
          >
            <div
              id={`comments-ms-${activeThread.id}`}
              className="min-w-0 toon-card my-auto flex max-h-[85vh] min-h-0 w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-surface *:min-w-0"
            >
              <div className="min-w-0 flex shrink-0 items-center justify-between gap-3 border-b-[3px] border-outline p-4 *:min-w-0 max-w-full">
                <h4 className="truncate text-lg font-black">
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
              <div className="flex min-h-0 flex-1 flex-col">
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
