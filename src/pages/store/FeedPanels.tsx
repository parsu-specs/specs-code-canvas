import { useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowLeft, ArrowRight } from "@phosphor-icons/react";
import { Button } from "../../components/Button";

export default function FeedPanels({
  children,
  highlights,
}: {
  children: ReactNode;
  highlights: ReactNode;
}) {
  const [showHighlights, setShowHighlights] = useState(false);
  const highlightsRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const panel = highlightsRef.current;
    if (!panel) return;

    // Tall highlights scroll with the page until their bottom reaches the
    // viewport; shorter highlights stay below the fixed header.
    const updateHeight = () => {
      panel.style.setProperty("--feed-highlights-height", `${panel.offsetHeight}px`);
    };
    updateHeight();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(updateHeight);
    observer.observe(panel);
    return () => observer.disconnect();
  }, []);
  return (
    <div className="mx-auto min-w-0 max-w-2xl @min-[52rem]/content:max-w-none">
      <div className="mb-4 flex min-w-0 items-center justify-between gap-3 @min-[52rem]/content:hidden">
        <h2 className="min-w-0 text-lg font-black">
          {showHighlights ? "Featured & announcements" : "Community feed"}
        </h2>
        <Button
          variant="outline"
          aria-label={
            showHighlights ? "Show community feed" : "Show featured apps and announcements"
          }
          aria-controls="feed-community-panel feed-highlights-panel"
          onClick={() => setShowHighlights((current) => !current)}
          className="min-h-11 min-w-11 shrink-0"
        >
          {showHighlights ? (
            <ArrowLeft size={20} weight="bold" aria-hidden="true" />
          ) : (
            <ArrowRight size={20} weight="bold" aria-hidden="true" />
          )}
        </Button>
      </div>
      <div className="grid min-w-0 items-start gap-6 @min-[52rem]/content:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] @min-[52rem]/content:gap-8">
        <div
          id="feed-community-panel"
          role="region"
          aria-label="Community feed"
          className={`min-w-0 ${showHighlights ? "hidden" : "block"} @min-[52rem]/content:block`}
        >
          {children}
        </div>
        <aside
          ref={highlightsRef}
          id="feed-highlights-panel"
          aria-label="Featured apps and official announcements"
          className={`min-w-0 ${showHighlights ? "block" : "hidden"} @min-[52rem]/content:block @min-[52rem]/content:sticky @min-[52rem]/content:[--feed-highlights-bottom:calc(7rem+env(safe-area-inset-bottom,0px))] @min-[52rem]/content:top-[min(calc(var(--spacing-header)+2rem),calc(100dvh-var(--feed-highlights-height,0px)-var(--feed-highlights-bottom)))] lg:@min-[52rem]/content:[--feed-highlights-bottom:2rem]`}
        >
          {highlights}
        </aside>
      </div>
    </div>
  );
}
