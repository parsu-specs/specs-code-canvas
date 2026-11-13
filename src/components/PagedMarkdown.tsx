import { useEffect, useRef, useState } from "react";
import Markdown from "./Markdown";
import { Button } from "./Button";

type PagedMarkdownProps = {
  text: string;
  /** Visible height of the first chunk. */
  collapsedPx?: number;
  /** Extra pixels revealed per See more press. Never jumps to full. */
  stepPx?: number;
  /** Docs at or below this length render fully with no buttons. */
  limit?: number;
  /** Fade gradient target — match the surrounding card background. */
  fadeTo?: string;
};

/**
 * Stepped document pager: shows the first chunk, then reveals one part at a
 * time per See more press (never the full document at once). Collapse walks
 * back one part per press. Short docs render fully with no buttons.
 *
 * Height-clipping is used instead of slicing the markdown source so fenced
 * code blocks, tables, and lists never render half-broken mid-chunk.
 */
export default function PagedMarkdown({
  text,
  collapsedPx = 320,
  stepPx = 600,
  limit = 1000,
  fadeTo = "var(--color-surface)",
}: PagedMarkdownProps) {
  const long = text.length > limit;
  const [height, setHeight] = useState<number>(collapsedPx);
  const [contentHeight, setContentHeight] = useState(0);
  const hasMore = contentHeight > height;
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setHeight(collapsedPx);
  }, [text, collapsedPx]);

  useEffect(() => {
    const el = contentRef.current;
    if (!el || !long) {
      setContentHeight(0);
      return;
    }
    const check = () => setContentHeight(el.scrollHeight);
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => ro.disconnect();
  }, [text, long]);

  if (!long) {
    return <Markdown text={text} />;
  }

  const expanded = height > collapsedPx;
  const seeMore = () => setHeight((h) => h + stepPx);
  const seeLess = () => setHeight((h) => Math.max(collapsedPx, h - stepPx));

  return (
    <div>
      <div style={{ maxHeight: height }} className="relative max-w-full overflow-hidden">
        <div ref={contentRef} className="flow-root min-w-0 max-w-full">
          <Markdown text={text} />
        </div>
        {hasMore && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-0 h-24"
            style={{ background: `linear-gradient(to top, ${fadeTo}, transparent)` }}
          />
        )}
      </div>
      <div className="min-w-0 mt-4 flex flex-wrap items-center gap-3 max-w-full">
        {hasMore && (
          <Button
            variant="secondary"
            size="small"
            type="button"
            onClick={seeMore}
            aria-expanded={expanded}
          >
            See more
          </Button>
        )}
        {expanded && (
          <Button
            variant="surface"
            size="small"
            type="button"
            onClick={seeLess}
            aria-expanded={expanded}
          >
            Collapse
          </Button>
        )}
      </div>
    </div>
  );
}
