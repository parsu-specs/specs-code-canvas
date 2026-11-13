import { CloseButton } from "./CloseButton";
import { RowsSkeleton } from "./Skeleton";
import { useId } from "react";
import {
  ArrowRight,
  Bell,
  ChatCircleDots,
  Heart,
  RocketLaunch,
  Sparkle,
  ThumbsUp,
  UsersThree,
} from "@phosphor-icons/react";
import UploadStamp from "./UploadStamp";
import { arrivalKeyOf } from "../utils/notifications";
import type { NotificationItem } from "../data/types";
import { Button } from "./Button";
import Popover from "./Popover";

type NotificationBellProps = {
  items: NotificationItem[];
  unreadIds: Set<string>;
  /** First-seen timestamps per id — vote/collab aggregates display these. */
  arrivalAt: Record<string, string>;
  loading: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenApp: (appId: string) => void;
  onOpenFeed: () => void;
  onMarkAllRead: () => void;
  onMarkRead: (id: string) => void;
  onDeleteAll: () => void;
};

const KIND_ICON: Record<NotificationItem["kind"], typeof Bell> = {
  comment: ChatCircleDots,
  reply: ChatCircleDots,
  vote: Heart,
  like: ThumbsUp,
  project: RocketLaunch,
  update: Sparkle,
  collab: UsersThree,
};

const KIND_LABEL: Record<NotificationItem["kind"], string> = {
  comment: "Comment",
  reply: "Reply",
  vote: "Likes",
  like: "Like",
  project: "New project",
  update: "Feed",
  collab: "Collaborator",
};

export default function NotificationBell({
  items,
  unreadIds,
  arrivalAt,
  loading,
  open,
  onOpenChange,
  onOpenApp,
  onOpenFeed,
  onMarkAllRead,
  onMarkRead,
  onDeleteAll,
}: NotificationBellProps) {
  const panelId = useId();
  const unread = items.filter((i) => unreadIds.has(i.id)).length;

  const go = (item: NotificationItem) => {
    onMarkRead(item.id);
    onOpenChange(false);
    if (item.appId) onOpenApp(item.appId);
    else onOpenFeed();
  };

  // Aggregates carry their project's date as createdAt (no event time
  // exists), so their stamp shows the arrival instead — otherwise a fresh
  // tag/vote on an old project reads as a stale reused row. The arrival key
  // versions content, so an edit shows the edit's arrival, not the first.
  const stampTitle = (item: NotificationItem): string | undefined => {
    const arrived = arrivalAt[arrivalKeyOf(item)];
    if (!arrived || Number.isNaN(Date.parse(arrived))) return undefined;
    const when = new Date(arrived).toLocaleString();
    const uploaded = new Date(item.createdAt).toLocaleString();
    return item.kind === "vote"
      ? `New likes ${when} · Project uploaded ${uploaded}`
      : item.kind === "like"
        ? `Liked your comment ${when}`
        : `Tagged as collaborator ${when} · Project uploaded ${uploaded}`;
  };

  return (
    <Popover
      open={open}
      onOpenChange={onOpenChange}
      id={panelId}
      label="Notifications"
      className="w-96 overflow-hidden"
      trigger={
        <Button
          type="button"
          variant="surface"
          size="compact-icon"
          onClick={() => onOpenChange(!open)}
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-controls={open ? panelId : undefined}
          aria-label={unread > 0 ? `Notifications, ${unread} unread` : "Notifications"}
          title="Notifications"
          className="relative text-foreground"
        >
          <Bell size={20} weight={unread > 0 ? "fill" : "duotone"} aria-hidden="true" />
          {unread > 0 && (
            <span
              aria-hidden="true"
              className="absolute -right-2 -top-2 min-w-5 rounded-full border-2 border-outline bg-danger px-1 text-center text-[10px] font-black leading-4 text-primary-foreground"
            >
              {unread > 99 ? "99+" : unread}
            </span>
          )}
        </Button>
      }
    >
      <div className="flex shrink-0 items-start justify-between gap-3 p-4">
        <div className="min-w-0">
          <h2 className="text-lg font-black">Notifications</h2>
          <p className="mt-1 text-xs font-bold text-muted">
            {unread > 0 ? `${unread} unread updates` : "You're all caught up"}
          </p>
        </div>
        <CloseButton
          type="button"
          onClick={() => onOpenChange(false)}
          aria-label="Close notifications"
        />
      </div>
      {items.length > 0 && (
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-y-2 border-dashed border-divider/60 px-3 py-2">
          {unread > 0 && (
            <Button
              variant="menu"
              type="button"
              onClick={() => onMarkAllRead()}
              className="min-h-10 w-auto! px-3 text-xs"
            >
              Mark all read
            </Button>
          )}
          {items.length > 0 && (
            <Button
              variant="menu"
              type="button"
              onClick={() => onDeleteAll()}
              title="Delete all notifications"
              className="ml-auto min-h-10 w-auto! px-3 text-xs text-danger hover:bg-danger/10"
            >
              Delete all
            </Button>
          )}
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3">
        {loading ? (
          <RowsSkeleton label="Checking for updates" />
        ) : items.length === 0 ? (
          <div className="p-5 text-center">
            <Bell size={28} weight="duotone" className="mx-auto text-muted" />
            <p className="mt-2 font-black">All caught up</p>
            <p className="mt-1 text-sm font-bold text-muted">
              Comments, replies, likes, new projects, and Feed posts land here.
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {items.map((item) => {
              const Icon = KIND_ICON[item.kind];
              const isUnread = unreadIds.has(item.id);
              return (
                <li key={item.id}>
                  <Button
                    variant="plain"
                    type="button"
                    onClick={() => go(item)}
                    className={`min-w-0 flex w-full items-start gap-3 rounded-xl border-2 border-dashed p-3 text-left hover:bg-background ${
                      isUnread ? "border-primary/40 bg-primary/5" : "border-divider/60"
                    } max-w-full`}
                  >
                    <span
                      className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${isUnread ? "bg-primary/15 text-primary" : "bg-background text-muted"}`}
                    >
                      <Icon size={20} weight="duotone" aria-hidden="true" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="min-w-0 flex flex-wrap items-center gap-2 max-w-full">
                        <span className="rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-black uppercase text-primary">
                          {KIND_LABEL[item.kind]}
                        </span>
                        {isUnread && (
                          <span
                            aria-label="Unread"
                            className="h-2 w-2 shrink-0 rounded-full bg-danger"
                          />
                        )}
                      </span>
                      <span className="mt-2 block wrap-anywhere text-sm font-black">
                        {item.title}
                      </span>
                      <span className="mt-0.5 block line-clamp-2 text-xs font-bold text-muted">
                        {item.body}
                      </span>
                      <span className="min-w-0 mt-3 flex flex-wrap items-center gap-1 border-t-2 border-dashed border-divider/60 pt-2 max-w-full">
                        {item.kind === "vote" || item.kind === "collab" || item.kind === "like" ? (
                          <UploadStamp
                            createdAt={item.createdAt}
                            displayAt={arrivalAt[arrivalKeyOf(item)]}
                            titleText={stampTitle(item)}
                          />
                        ) : (
                          <UploadStamp createdAt={item.createdAt} />
                        )}
                        <ArrowRight
                          size={12}
                          weight="bold"
                          aria-hidden="true"
                          className="ml-auto shrink-0 text-muted"
                        />
                      </span>
                    </span>
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </Popover>
  );
}
