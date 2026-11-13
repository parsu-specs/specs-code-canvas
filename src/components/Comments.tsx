import { userFacingError } from "../utils/userFacingError";
import { RowsSkeleton } from "./Skeleton";
import React, { useEffect, useMemo, useState } from "react";
import { ChatCircleDots, Heart, PaperPlaneTilt, User as UserIcon } from "@phosphor-icons/react";
import VotersDialog from "./VotersDialog";
import Avatar from "./Avatar";
import DeleteMenu from "./DeleteMenu";
import TrophyMark from "./TrophyMark";
import { Button } from "./Button";
import MentionInput from "./MentionInput";
import MentionText from "./MentionText";
import PostTimestamp, { PostTimeProvider } from "./PostTimestamp";
import { getAppRepo } from "../data/factory";
import { assertReplyDepth, MAX_COMMENT_LEVELS } from "../data/commentRules";
import { profileForComment } from "../data/profileLinks";
import type { Comment, Profile, User } from "../data/types";

type CommentsProps = {
  appId: string;
  appTitle: string;
  currentUser: User | null;
  profiles: Map<string, Profile>;
  trophies: Map<string, 1 | 2 | 3>;
  onOpenProfile: (profileId: string) => void;
  onCommentAdded?: (appId: string, count: number) => void;
  stickyForm?: boolean;
};

const REPLY_INITIAL = 1;
const REPLY_STEP = 3;

const authorName = (c: Comment) => (c.isDeleted ? "User" : c.authorName);

function authorHeader(
  c: Comment,
  profiles: Map<string, Profile>,
  trophies: Map<string, 1 | 2 | 3>,
  onOpenProfile: (profileId: string) => void,
  avatarSize: "sm" = "sm",
) {
  const p = c.isDeleted ? null : profileForComment(c, profiles);
  const displayName = p ? p.name : authorName(c);
  const place = c.isDeleted ? undefined : trophies.get(c.authorId);
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      {c.isDeleted ? (
        <span
          aria-hidden="true"
          className="grid h-8 w-8 shrink-0 place-items-center rounded-full border-[3px] border-outline bg-background text-muted"
        >
          <UserIcon size={18} weight="fill" />
        </span>
      ) : p ? (
        <Button
          variant="plain"
          onClick={() => onOpenProfile(p.id)}
          aria-label={`View ${p.name}'s profile`}
          className="shrink-0"
        >
          <Avatar name={p.name} color={p.color} imageUrl={p.imageUrl} size={avatarSize} />
        </Button>
      ) : (
        <Avatar name={c.authorName} color="sky" size={avatarSize} />
      )}
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1 text-xs font-black leading-5 wrap-anywhere">
        {p ? (
          <Button variant="text" onClick={() => onOpenProfile(p.id)} className="text-left">
            {displayName}
          </Button>
        ) : (
          displayName
        )}
        {place !== undefined && <TrophyMark minimal place={place} size={16} />}
        <PostTimestamp createdAt={c.createdAt} subject="comment" />
      </div>
    </div>
  );
}

export default function Comments({
  appId,
  appTitle,
  currentUser,
  profiles,
  trophies,
  onOpenProfile,
  onCommentAdded,
  stickyForm = false,
}: CommentsProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [body, setBody] = useState("");
  const [posting, setPosting] = useState(false);
  const [postError, setPostError] = useState<string | null>(null);
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyBody, setReplyBody] = useState("");
  const [replying, setReplying] = useState(false);
  const [replyError, setReplyError] = useState<string | null>(null);
  const [likePending, setLikePending] = useState<Set<string>>(new Set());
  const [visibleReplies, setVisibleReplies] = useState<Record<string, number>>({});
  const mentionProfiles = useMemo(
    () => [...new Map([...profiles.values()].map((p) => [p.id, p])).values()],
    [profiles],
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getAppRepo()
      .listComments(appId, currentUser?.id)
      .then((items) => {
        if (!cancelled) setComments(items);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Could not load comments.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [appId, currentUser?.id]);

  const removeComment = async (c: Comment) => {
    if (!currentUser || c.authorId !== currentUser.id) return;
    await getAppRepo().deleteComment(appId, c.id, currentUser);
    const next = await getAppRepo().listComments(appId, currentUser.id);
    setComments(next);
    onCommentAdded?.(appId, next.length);
    if (replyTo === c.id) setReplyTo(null);
  };

  const topLevel = comments
    .filter((c) => !c.parentId)
    .sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt));
  const childrenOf = (parentId: string) =>
    comments
      .filter((c) => c.parentId === parentId)
      .sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt));

  const toggleLike = async (c: Comment) => {
    if (!currentUser || c.isDeleted || likePending.has(c.id)) return;
    setLikePending((prev) => new Set(prev).add(c.id));
    const wasLiked = Boolean(c.viewerHasLiked);
    setComments((items) =>
      items.map((x) =>
        x.id === c.id
          ? {
              ...x,
              viewerHasLiked: !wasLiked,
              likes: Math.max(0, (x.likes ?? 0) + (wasLiked ? -1 : 1)),
            }
          : x,
      ),
    );
    try {
      const updated = await getAppRepo().toggleCommentLike(appId, c.id, currentUser.id);
      setComments((items) => items.map((x) => (x.id === c.id ? { ...x, ...updated } : x)));
    } catch {
      setComments((items) => items.map((x) => (x.id === c.id ? c : x)));
    } finally {
      setLikePending((prev) => {
        const next = new Set(prev);
        next.delete(c.id);
        return next;
      });
    }
  };

  const postTop = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !body.trim() || posting) return;
    setPosting(true);
    setPostError(null);
    try {
      const created = await getAppRepo().addComment(appId, currentUser, body.trim());
      setComments((items) => {
        onCommentAdded?.(appId, items.length + 1);
        return [...items, created];
      });
      setBody("");
    } catch (e) {
      setPostError(e instanceof Error ? e.message : "Could not post comment.");
    } finally {
      setPosting(false);
    }
  };

  const openReply = (parent: Comment) => {
    setReplyTo(parent.id);
    const target = profileForComment(parent, profiles);
    setReplyBody(parent.isDeleted ? "" : `@${target?.name ?? parent.authorName} `);
    setReplyError(null);
  };

  const postReply = async (e: React.FormEvent, parentId: string) => {
    e.preventDefault();
    if (!currentUser || !replyBody.trim() || replying) return;
    setReplying(true);
    setReplyError(null);
    try {
      assertReplyDepth(comments, parentId);
      const created = await getAppRepo().addComment(appId, currentUser, replyBody.trim(), parentId);
      setComments((items) => {
        const next = [...items, created];
        onCommentAdded?.(appId, next.length);
        return next;
      });
      setVisibleReplies((prev) => {
        const total = comments.filter((x) => x.parentId === parentId).length + 1;
        return { ...prev, [parentId]: total };
      });
      setReplyTo(null);
      setReplyBody("");
    } catch (e) {
      setReplyError(e instanceof Error ? e.message : "Could not post reply.");
    } finally {
      setReplying(false);
    }
  };

  const likeButton = (c: Comment, small = false) => (
    <span className="inline-flex items-center gap-2">
      <Button
        variant="vote"
        size={small ? "compact" : "default"}
        type="button"
        onClick={() => void toggleLike(c)}
        aria-pressed={Boolean(c.viewerHasLiked)}
        aria-label={c.viewerHasLiked ? "Unlike this comment" : "Like this comment"}
        disabled={!currentUser || c.isDeleted || likePending.has(c.id)}
        title={currentUser ? undefined : "Sign in to like"}
        className={c.viewerHasLiked ? "" : "text-muted"}
      >
        <Heart size={small ? 15 : 16} weight={c.viewerHasLiked ? "fill" : "duotone"} />
      </Button>
      {!c.isDeleted && (
        <VotersDialog
          target="comment"
          appId={c.id}
          appTitle={`comment by ${c.authorName}`}
          totalVotes={c.likes ?? 0}
          onOpenProfile={onOpenProfile}
        />
      )}
    </span>
  );

  const form = (
    <>
      {currentUser ? (
        <form
          onSubmit={(e) => void postTop(e)}
          className="flex min-w-0 flex-wrap items-center gap-3"
        >
          <div className="block min-w-0 flex-1 basis-40 pb-1">
            <MentionInput
              value={body}
              onChange={setBody}
              profiles={mentionProfiles}
              ariaLabel={`Add feedback for ${appTitle}`}
              suggestionsPlacement={stickyForm ? "above" : "below"}
              maxLength={500}
              placeholder="Reply to this post..."
              className="py-2 text-sm"
            />
          </div>
          <Button
            variant="secondary"
            size="small"
            type="submit"
            disabled={posting || !body.trim()}
            className="shrink-0"
          >
            {posting ? "…" : "Reply"}
          </Button>
        </form>
      ) : (
        <p className="text-sm font-bold text-muted">Sign in to join the discussion.</p>
      )}
      {postError && (
        <p role="alert" className="mt-2 text-sm font-bold">
          {userFacingError(postError)}
        </p>
      )}
    </>
  );

  const renderNode = (c: Comment, depth: number): React.ReactNode => {
    const kids = childrenOf(c.id);
    const visible = Math.min(visibleReplies[c.id] ?? REPLY_INITIAL, Math.max(kids.length, 1));
    const shown = kids.slice(0, visible);
    const hidden = kids.length - shown.length;
    const replyTarget = replyTo === c.id ? comments.find((x) => x.id === c.id) : undefined;
    const childListClass =
      depth < 2
        ? "mt-4 space-y-3 border-l-2 border-dashed border-divider/60 pl-2 sm:pl-3"
        : "mt-4 space-y-3";
    return (
      <li
        key={c.id}
        className={
          depth === 0
            ? "rounded-xl border-2 border-dashed border-divider/60 p-4"
            : "rounded-xl border-2 border-dashed border-divider/60 p-3"
        }
      >
        {authorHeader(c, profiles, trophies, onOpenProfile)}
        <p className="mt-3 wrap-anywhere text-sm leading-6">
          {c.isDeleted ? (
            <span className="italic text-muted">Deleted comment</span>
          ) : (
            <MentionText
              mentions={c.mentions ?? []}
              text={c.body}
              profiles={mentionProfiles}
              onOpenProfile={onOpenProfile}
            />
          )}
        </p>
        <div className="mt-3 flex min-w-0 flex-wrap items-center gap-x-4 gap-y-2 border-t-2 border-dashed border-divider/60 pt-2">
          {!c.isDeleted && likeButton(c, depth > 0)}
          {currentUser && depth < MAX_COMMENT_LEVELS - 1 ? (
            <Button
              variant="plain"
              type="button"
              onClick={() => {
                if (replyTo !== c.id) openReply(c);
              }}
              aria-expanded={replyTo === c.id}
              className="min-w-0 flex min-h-10 items-center gap-2 rounded-xl px-2 text-xs font-black text-muted transition-colors hover:bg-background hover:text-primary max-w-full"
            >
              <ChatCircleDots size={15} weight="duotone" />
              Reply
              {kids.length > 0 && ` (${kids.length})`}
            </Button>
          ) : (
            kids.length > 0 && (
              <span className="text-xs font-black text-muted">
                {kids.length} {kids.length === 1 ? "reply" : "replies"}
              </span>
            )
          )}
          {!c.isDeleted && currentUser && c.authorId === currentUser.id && (
            <div className="ml-auto">
              <DeleteMenu
                label={`Options for your ${c.parentId ? "reply" : "comment"}`}
                onDelete={() => removeComment(c)}
              />
            </div>
          )}
        </div>

        {shown.length > 0 && (
          <ul className={childListClass}>{shown.map((r) => renderNode(r, depth + 1))}</ul>
        )}

        {kids.length > REPLY_INITIAL && (
          <div className="min-w-0 mt-2 flex flex-wrap items-center gap-2 max-w-full">
            {hidden > 0 && (
              <Button
                variant="surface"
                size="compact"
                type="button"
                onClick={() =>
                  setVisibleReplies((prev) => ({
                    ...prev,
                    [c.id]: visible + REPLY_STEP,
                  }))
                }
              >
                See more ({hidden} more)
              </Button>
            )}
            {visible > REPLY_INITIAL && (
              <Button
                variant="surface"
                size="compact"
                type="button"
                onClick={() =>
                  setVisibleReplies((prev) => ({
                    ...prev,
                    [c.id]: Math.max(REPLY_INITIAL, visible - REPLY_STEP),
                  }))
                }
              >
                Collapse
              </Button>
            )}
            {hidden > 0 ? (
              <Button
                variant="text"
                type="button"
                onClick={() => setVisibleReplies((prev) => ({ ...prev, [c.id]: kids.length }))}
                className="text-xs font-black underline decoration-2 underline-offset-4"
              >
                Show all ({kids.length})
              </Button>
            ) : (
              visible > REPLY_INITIAL && (
                <Button
                  variant="text"
                  type="button"
                  onClick={() => setVisibleReplies((prev) => ({ ...prev, [c.id]: REPLY_INITIAL }))}
                  className="text-xs font-black underline decoration-2 underline-offset-4"
                >
                  Collapse
                </Button>
              )
            )}
          </div>
        )}

        {replyTo === c.id && currentUser && depth < MAX_COMMENT_LEVELS - 1 && (
          <form
            onSubmit={(e) => void postReply(e, c.id)}
            className="mt-3 flex min-w-0 items-center gap-3"
          >
            <div className="min-w-0 flex-1 basis-40">
              <MentionInput
                value={replyBody}
                onChange={setReplyBody}
                profiles={mentionProfiles}
                ariaLabel={`Reply to ${replyTarget ? authorName(replyTarget) : "comment"}`}
                maxLength={500}
                autoFocus
                placeholder={`Reply to ${replyTarget ? authorName(replyTarget) : "comment"}…`}
                className="py-2 pr-12 text-sm"
                trailingAction={
                  <Button
                    variant="minimal"
                    size="compact-icon"
                    type="submit"
                    disabled={replying || !replyBody.trim()}
                    aria-label={replying ? "Sending reply" : "Send reply"}
                    aria-busy={replying}
                    title={replying ? "Sending reply" : "Send reply"}
                    className="h-8 w-8 shrink-0"
                  >
                    <PaperPlaneTilt size={20} weight="duotone" aria-hidden="true" />
                  </Button>
                }
              />
            </div>
            <Button
              variant="text"
              type="button"
              disabled={replying}
              onClick={() => {
                setReplyTo(null);
                setReplyBody("");
                setReplyError(null);
              }}
              className="shrink-0 rounded px-1 py-1 text-xs text-muted"
            >
              Cancel
            </Button>
          </form>
        )}
        {replyTo === c.id && replyError && (
          <p role="alert" className="mt-2 text-sm font-bold">
            {userFacingError(replyError)}
          </p>
        )}
      </li>
    );
  };

  return (
    <PostTimeProvider>
      <div className={stickyForm ? "flex min-h-0 flex-1 flex-col overflow-hidden" : "min-w-0"}>
        <div
          className={
            stickyForm ? "min-h-0 flex-1 overflow-y-auto overscroll-contain p-4" : undefined
          }
        >
          {loading ? (
            <RowsSkeleton label="Loading feedback" />
          ) : topLevel.length ? (
            <ul className="space-y-3">{topLevel.map((c) => renderNode(c, 0))}</ul>
          ) : (
            <p className="text-sm font-bold text-muted">
              No feedback yet. Be the first to share something useful.
            </p>
          )}
          {error && (
            <p role="alert" className="mt-2 text-sm font-bold">
              {userFacingError(error)}
            </p>
          )}
        </div>
        {stickyForm ? (
          <div className="shrink-0 border-t-2 border-dashed border-divider/60 bg-panel modal-grid p-4">
            {form}
          </div>
        ) : (
          <div className="mt-4">{form}</div>
        )}
      </div>
    </PostTimeProvider>
  );
}
