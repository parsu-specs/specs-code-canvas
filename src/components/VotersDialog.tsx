import { userFacingError } from "../utils/userFacingError";
import { RowsSkeleton } from "./Skeleton";
import { CloseButton } from "./CloseButton";
import { Button } from "./Button";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Heart } from "@phosphor-icons/react";
import Avatar from "./Avatar";
import { getAppRepo, getProfileRepo } from "../data/factory";
import type { Profile } from "../data/types";

type VotersDialogProps = {
  target?: "app" | "feedPost" | "comment";
  appId: string;
  appTitle: string;
  totalVotes: number;
  onOpenProfile: (profileId: string) => void;
  compact?: boolean;
  size?: "small" | "default";
};

/**
 * Upvote count trigger and dialog with one profile button per voter.
 * The list is fetched lazily on open so cards stay cheap.
 */
export default function VotersDialog({
  target = "app",
  appId,
  appTitle,
  totalVotes,
  onOpenProfile,
  compact = false,
  size = "small",
}: VotersDialogProps) {
  const reaction = "like";
  const [open, setOpen] = useState(false);
  const [voters, setVoters] = useState<Profile[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    const load = async () => {
      if (target !== "comment") return getAppRepo().listVoters(appId, target);
      const likers = await getAppRepo().listCommentLikers([appId]);
      const ids = new Set(likers[appId] ?? []);
      if (!ids.size) return [];
      return (await getProfileRepo().listProfiles())
        .filter((profile) => ids.has(profile.id))
        .sort((a, b) => a.name.localeCompare(b.name));
    };
    load()
      .then((list) => {
        if (!cancelled) setVoters(list);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Could not load likes.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, appId, target, attempt, totalVotes]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  const goProfile = (profileId: string) => {
    setOpen(false);
    onOpenProfile(profileId);
  };

  return (
    <>
      <Button
        variant="text"
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          setOpen(true);
        }}
        aria-haspopup="dialog"
        aria-expanded={open}
        title={
          totalVotes === 1
            ? `See who ${reaction}d (1 ${reaction})`
            : `See who ${reaction}d (${totalVotes} ${reaction}s)`
        }
        aria-label={`See who liked ${appTitle} (${totalVotes} ${totalVotes === 1 ? "like" : "likes"})`}
        className={
          compact
            ? "translate-y-[1.5px] inline-flex! min-h-8 min-w-6 shrink-0 text-xs"
            : size === "default"
              ? "inline-flex! min-h-11 text-sm"
              : "translate-y-[1.5px] text-xs"
        }
      >
        <span
          className={
            !compact && size === "default" ? "relative top-[1.4px] leading-none" : undefined
          }
        >
          {totalVotes}
          {!compact && ` ${reaction}${totalVotes === 1 ? "" : "s"}`}
        </span>
      </Button>

      {open &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`Likes for ${appTitle}`}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-100 flex items-center justify-center overflow-y-auto bg-inverse/80 p-4"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="toon-card my-auto flex max-h-[85vh] min-h-0 w-full max-w-md flex-col overflow-hidden bg-panel"
            >
              <div className="min-w-0 flex shrink-0 items-center justify-between gap-3 border-b-[3px] border-outline bg-primary text-primary-foreground p-4 max-w-full">
                <h4 className="flex items-center gap-2 truncate text-lg font-black max-w-full">
                  <Heart size={20} weight="duotone" aria-hidden="true" />
                  <span className="truncate">
                    Liked by
                    {voters !== null && ` (${voters.length})`}
                  </span>
                </h4>
                <CloseButton
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Close likes"
                  autoFocus
                />
              </div>
              <div className="modal-grid min-h-0 flex-1 overflow-y-auto overscroll-contain p-4">
                {loading ? (
                  <RowsSkeleton label="Loading likes" />
                ) : error ? (
                  <div className="text-center">
                    <p role="alert" className="text-sm font-bold">
                      {userFacingError(error)}
                    </p>
                    <Button
                      variant="text"
                      type="button"
                      onClick={() => setAttempt((n) => n + 1)}
                      className="mt-3 text-sm font-black"
                    >
                      Try again
                    </Button>
                  </div>
                ) : voters !== null && voters.length > 0 ? (
                  <>
                    <ul className="space-y-1">
                      {voters.map((v) => (
                        <li key={v.id}>
                          <Button
                            variant="plain"
                            type="button"
                            onClick={() => goProfile(v.id)}
                            aria-label={`View ${v.name}'s profile`}
                            className="flex items-center w-full justify-start gap-3 rounded-xl border-2 border-transparent p-2 text-left transition-colors group hover:border-outline hover:bg-background focus-visible:border-outline focus-visible:bg-background"
                          >
                            <Avatar name={v.name} color={v.color} imageUrl={v.imageUrl} size="sm" />
                            <span className="flex-1 truncate text-sm font-black group-hover:text-primary transition-colors">
                              {v.name}
                            </span>
                          </Button>
                        </li>
                      ))}
                    </ul>
                    {totalVotes > voters.length && (
                      <p className="mt-3 text-center text-xs font-bold text-muted">
                        {totalVotes} total likes · {voters.length} profile
                        {voters.length === 1 ? "" : "s"} shown (older reactions predate like
                        tracking).
                      </p>
                    )}
                  </>
                ) : totalVotes > 0 ? (
                  <p className="text-center text-sm font-bold text-muted">
                    {totalVotes} {reaction}
                    {totalVotes === 1 ? "" : "s"}, but names aren&apos;t available for older
                    reactions.
                  </p>
                ) : (
                  <p className="text-center text-sm font-bold text-muted">
                    No {reaction}s yet. Be the first to like.
                  </p>
                )}
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
