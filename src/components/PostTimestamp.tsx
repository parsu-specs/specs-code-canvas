import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { formatRelativeAge } from "../utils/time";
import { Button } from "./Button";
import { Clock } from "@phosphor-icons/react";

const PostTimeContext = createContext<number | null>(null);

/** One clock for posts, comments, and projects; only timestamp consumers update on each tick. */
export function PostTimeProvider({ children }: { children: ReactNode }) {
  const parentNow = useContext(PostTimeContext);
  const hasParentClock = parentNow !== null;
  const [now, setNow] = useState(Date.now);

  useEffect(() => {
    if (hasParentClock) return;
    let timer: ReturnType<typeof setInterval> | undefined;
    const syncVisibility = () => {
      clearInterval(timer);
      timer = undefined;
      if (document.visibilityState === "hidden") return;
      setNow(Date.now());
      timer = setInterval(() => setNow(Date.now()), 60_000);
    };
    syncVisibility();
    document.addEventListener("visibilitychange", syncVisibility);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", syncVisibility);
    };
  }, [hasParentClock]);

  return <PostTimeContext.Provider value={parentNow ?? now}>{children}</PostTimeContext.Provider>;
}

export default function PostTimestamp({
  createdAt,
  subject = "post",
}: {
  createdAt: string;
  subject?: string;
}) {
  const now = useContext(PostTimeContext);
  const [showExact, setShowExact] = useState(false);
  const exact = useMemo(() => {
    const date = new Date(createdAt);
    return Number.isFinite(date.getTime())
      ? { text: date.toLocaleString(), iso: date.toISOString() }
      : null;
  }, [createdAt]);
  const relative = formatRelativeAge(createdAt, now ?? Date.now());
  if (!exact || !relative) return null;

  return (
    <Button
      type="button"
      variant="text"
      className="inline-flex items-center gap-1 cursor-pointer text-left text-[10px] font-bold text-muted"
      onClick={() => setShowExact((value) => !value)}
      aria-pressed={showExact}
      aria-label={
        showExact
          ? `Show relative time for this ${subject}`
          : `Show exact date and time for this ${subject}: ${exact.text}`
      }
      title={
        showExact ? "Click to show relative time" : `${exact.text} — click to show date and time`
      }
    >
      <Clock size={10} weight="duotone" aria-hidden="true" />
      <time dateTime={exact.iso}>{showExact ? exact.text : relative}</time>
    </Button>
  );
}
