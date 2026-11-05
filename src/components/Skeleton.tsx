import React, { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export const SkeletonDelayContext = createContext(180);

export function SkeletonBlock({ className = "" }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`block shrink-0 rounded-lg bg-divider/40 motion-safe:animate-pulse ${className}`}
    />
  );
}

export function LoadingRegion({
  label,
  children,
  className = "",
  delay,
}: {
  label: string;
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const inheritedDelay = useContext(SkeletonDelayContext);
  const wait = delay ?? inheritedDelay;
  const [visible, setVisible] = useState(wait === 0);
  useEffect(() => {
    const timer = window.setTimeout(() => setVisible(true), wait);
    return () => window.clearTimeout(timer);
  }, [wait]);
  return (
    <div
      role={visible ? "status" : undefined}
      aria-busy={visible || undefined}
      aria-label={visible ? label : undefined}
      aria-hidden={!visible || undefined}
      data-loading-placeholder=""
      data-visible={visible}
      className={`min-w-0 max-w-full ${visible ? (wait === 0 ? "" : "motion-safe:animate-placeholder-in") : "invisible"} ${className}`}
    >
      {visible && <span className="sr-only">{label}</span>}
      <div aria-hidden="true">{children}</div>
    </div>
  );
}

export function AppCardsSkeleton({ count = 6 }: { count?: number }) {
  return (
    <LoadingRegion label="Loading projects">
      <div className="discovery-grid min-w-0 max-w-full *:min-w-0">
        {Array.from({ length: count }, (_, index) => (
          <div
            key={index}
            className="app-card toon-card toon-paper flex w-full min-w-0 max-w-sm flex-[1_1_18rem] flex-col bg-panel p-4"
          >
            <SkeletonBlock className="h-48 w-full rounded-xl border-[3px] border-outline/20" />
            <SkeletonBlock className="mt-2 h-4 w-20" />
            <SkeletonBlock className="mt-3 h-7 w-3/4" />
            <SkeletonBlock className="mt-2 h-5 w-1/2" />
            <div className="my-4 space-y-3">
              <SkeletonBlock className="h-3 w-full" />
              <SkeletonBlock className="h-3 w-full" />
              <SkeletonBlock className="h-3 w-4/5" />
            </div>
            <div className="mt-auto flex gap-3 border-t-2 border-dashed border-divider pt-4">
              <SkeletonBlock className="h-9 w-16" />
              <SkeletonBlock className="h-9 w-16" />
            </div>
          </div>
        ))}
      </div>
    </LoadingRegion>
  );
}

export function RowsSkeleton({
  label = "Loading updates",
  count = 3,
}: {
  label?: string;
  count?: number;
}) {
  return (
    <LoadingRegion label={label}>
      <div className="space-y-3">
        {Array.from({ length: count }, (_, index) => (
          <div key={index} className="flex min-w-0 gap-3 rounded-xl border-2 border-divider/40 p-3">
            <SkeletonBlock className="size-9 rounded-full" />
            <div className="min-w-0 flex-1 space-y-2 py-1">
              <SkeletonBlock className="h-4 w-1/2" />
              <SkeletonBlock className="h-3 w-full" />
              <SkeletonBlock className="h-3 w-3/4" />
            </div>
          </div>
        ))}
      </div>
    </LoadingRegion>
  );
}

export function FeedSkeleton() {
  return (
    <LoadingRegion label="Loading feeds" className="mt-4">
      <div className="space-y-3">
        {Array.from({ length: 3 }, (_, index) => (
          <div key={index} className="toon-card rounded-2xl bg-surface p-4 sm:p-5">
            <div className="flex items-center gap-3">
              <SkeletonBlock className="size-8 rounded-full" />
              <SkeletonBlock className="h-4 w-32" />
            </div>
            <SkeletonBlock className="mt-3 h-5 w-full" />
            <SkeletonBlock className="mt-2 h-5 w-3/4" />
            <div className="mt-4 flex gap-3 border-t-2 border-dashed border-divider pt-4">
              <SkeletonBlock className="h-8 w-14" />
              <SkeletonBlock className="h-8 w-14" />
            </div>
          </div>
        ))}
      </div>
    </LoadingRegion>
  );
}

export function FormSkeleton({ label = "Loading form" }: { label?: string }) {
  return (
    <LoadingRegion label={label} className="mt-4">
      <div className="space-y-5">
        <div className="space-y-2">
          <SkeletonBlock className="h-5 w-28" />
          <SkeletonBlock className="h-12 w-full" />
        </div>
        <div className="space-y-2">
          <SkeletonBlock className="h-5 w-20" />
          <SkeletonBlock className="h-28 w-full" />
        </div>
        <SkeletonBlock className="h-11 w-36" />
      </div>
    </LoadingRegion>
  );
}

export function DeveloperCardsSkeleton({ layout = "grid" }: { layout?: "grid" | "list" }) {
  return (
    <LoadingRegion label="Loading developers">
      <div
        className={
          layout === "grid"
            ? "grid gap-4 grid-cols-[repeat(auto-fit,minmax(min(100%,18rem),1fr))]"
            : "space-y-1"
        }
      >
        {Array.from({ length: 6 }, (_, index) => (
          <div
            key={index}
            className={`min-w-0 rounded-xl border-[3px] border-transparent ${layout === "grid" ? "p-4" : "grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1 px-3 py-2 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_auto]"}`}
          >
            <div
              className={`flex min-w-0 items-center gap-3 ${layout === "list" ? "col-span-2 sm:col-span-1" : ""}`}
            >
              <SkeletonBlock
                className={layout === "grid" ? "size-14 rounded-full" : "size-8 rounded-full"}
              />
              <SkeletonBlock className="h-6 w-1/2" />
            </div>
            <SkeletonBlock className={layout === "grid" ? "mt-2 h-5 w-3/4" : "h-4 w-3/4"} />
            <SkeletonBlock className={layout === "grid" ? "mt-3 h-4 w-1/2" : "h-4 w-24"} />
          </div>
        ))}
      </div>
    </LoadingRegion>
  );
}

export function LeaderboardSkeleton() {
  return (
    <LoadingRegion label="Loading rankings">
      <div className="grid grid-cols-3 items-end gap-2 pt-4 sm:gap-5">
        {[1, 0, 2].map((place) => (
          <div
            key={place}
            className="toon-card flex min-w-0 flex-col items-center rounded-2xl bg-panel px-2 py-5 sm:px-4 sm:py-7"
          >
            <SkeletonBlock
              className={
                place === 0
                  ? "mb-3 size-24 rounded-full"
                  : place === 1
                    ? "mb-3 size-15 rounded-full"
                    : "mb-3 size-12 rounded-full"
              }
            />
            <SkeletonBlock className="mb-3 h-5 w-3/4" />
            <SkeletonBlock className="size-14 rounded-full sm:size-20" />
            <SkeletonBlock className="mt-3 h-7 w-full" />
            <SkeletonBlock className="mt-1 h-5 w-3/4" />
            <SkeletonBlock className="mt-4 h-6 w-1/2" />
          </div>
        ))}
      </div>
      <div className="mt-6 space-y-3">
        {[0, 1, 2].map((index) => (
          <div
            key={index}
            className="toon-card flex min-w-0 items-center gap-3 rounded-2xl bg-surface p-3 sm:gap-4 sm:p-5"
          >
            <SkeletonBlock className="size-9 rounded-full" />
            <SkeletonBlock className="size-8 rounded-full" />
            <div className="min-w-0 flex-1 space-y-2">
              <SkeletonBlock className="h-5 w-1/2" />
              <SkeletonBlock className="h-4 w-1/3" />
            </div>
            <SkeletonBlock className="h-6 w-12" />
          </div>
        ))}
      </div>
    </LoadingRegion>
  );
}

export function PasswordSkeleton() {
  return (
    <LoadingRegion label="Checking sign-in methods" className="mt-4">
      <div className="space-y-3">
        <SkeletonBlock className="h-5 w-4/5" />
        <SkeletonBlock className="h-12 w-full" />
        <SkeletonBlock className="h-11 w-40" />
      </div>
    </LoadingRegion>
  );
}

export function SubmissionFormSkeleton() {
  return (
    <LoadingRegion label="Loading project form">
      <div className="grid min-w-0 gap-5 @min-[36rem]/content:grid-cols-2">
        {["name", "description", "collaborators"].map((field, index) => (
          <div key={field} className="space-y-2 @min-[36rem]/content:col-span-2">
            <SkeletonBlock className="h-4 w-2/5" />
            <SkeletonBlock className={index === 1 ? "h-28 w-full" : "h-12 w-full"} />
          </div>
        ))}
        {[0, 1].map((index) => (
          <div key={index} className="space-y-2">
            <SkeletonBlock className="h-4 w-24" />
            <SkeletonBlock className="h-12 w-full" />
          </div>
        ))}
        <div className="space-y-3 @min-[36rem]/content:col-span-2">
          <SkeletonBlock className="h-4 w-32" />
          <SkeletonBlock className="h-12 w-40" />
          <div className="flex gap-3">
            <SkeletonBlock className="h-24 w-32" />
            <SkeletonBlock className="h-24 w-32" />
          </div>
        </div>
        <div className="space-y-3 @min-[36rem]/content:col-span-2">
          <SkeletonBlock className="h-5 w-36" />
          <SkeletonBlock className="h-10 w-3/4" />
          <SkeletonBlock className="h-56 w-full" />
        </div>
        <SkeletonBlock className="h-12 w-44" />
      </div>
    </LoadingRegion>
  );
}

export function ProfileSkeleton() {
  return (
    <LoadingRegion label="Loading developer">
      <SkeletonBlock className="h-10 w-44" />
      <div className="toon-card toon-paper mt-5 rounded-2xl bg-panel p-6 pt-10 sm:p-8 sm:pt-12">
        <div className="flex min-w-0 flex-col items-center gap-5 sm:flex-row sm:items-start">
          <SkeletonBlock className="size-32 rounded-full" />
          <div className="w-full min-w-0 flex-1 space-y-3">
            <SkeletonBlock className="h-6 w-28" />
            <SkeletonBlock className="h-9 w-2/3" />
            <SkeletonBlock className="h-6 w-1/2" />
            <SkeletonBlock className="h-7 w-full" />
            <SkeletonBlock className="h-7 w-4/5" />
            <SkeletonBlock className="h-5 w-2/3" />
          </div>
        </div>
      </div>
      <SkeletonBlock className="mb-6 mt-8 h-8 w-52" />
      <AppCardsSkeleton count={3} />
    </LoadingRegion>
  );
}

export function ProjectSkeleton() {
  return (
    <LoadingRegion label="Loading project">
      <SkeletonBlock className="h-10 w-28" />
      <SkeletonBlock className="mt-5 h-80 w-full rounded-xl md:h-96" />
      <div className="p-8 lg:px-2">
        <SkeletonBlock className="h-6 w-28" />
        <SkeletonBlock className="mt-4 h-10 w-2/3" />
        <SkeletonBlock className="mt-3 h-8 w-full" />
        <SkeletonBlock className="mt-2 h-8 w-4/5" />
      </div>
    </LoadingRegion>
  );
}

export function SubmissionPromptSkeleton() {
  return (
    <LoadingRegion label="Loading project reminder" className="mb-5 lg:hidden">
      <div className="toon-card rounded-2xl bg-secondary p-4">
        <div className="flex items-start gap-2">
          <SkeletonBlock className="size-5.5" />
          <div className="min-w-0 flex-1 rounded-lg bg-divider/40 text-base font-black leading-tight text-transparent">
            No projects submitted yet
          </div>
          <SkeletonBlock className="size-11 rounded-full" />
        </div>
        <div className="mt-2 rounded-lg bg-divider/40 text-sm font-bold text-transparent">
          Share your build and get community feedback.
        </div>
        <SkeletonBlock className="mt-3 h-12 w-40" />
      </div>
    </LoadingRegion>
  );
}

export function StoreContentSkeleton({
  view,
  showPrompt = true,
}: {
  view: string;
  showPrompt?: boolean;
}) {
  if (view === "project") return <ProjectSkeleton />;
  if (view === "profile") return <ProfileSkeleton />;
  if (view === "feeds")
    return (
      <div className="mx-auto max-w-4xl">
        <LoadingRegion label="Loading feed composer">
          <div className="space-y-3">
            <SkeletonBlock className="h-7 w-64" />
            <SkeletonBlock className="h-36 w-full" />
            <SkeletonBlock className="h-12 w-full" />
          </div>
        </LoadingRegion>
        <FeedSkeleton />
      </div>
    );
  if (view === "settings")
    return (
      <div className="space-y-6">
        {["Loading user info", "Checking sign-in methods", "Loading appearance settings"].map(
          (label, index) => (
            <div
              key={label}
              className="toon-card toon-paper rounded-2xl bg-panel p-6 pt-10 sm:p-8 sm:pt-12"
            >
              <LoadingRegion label={label}>
                <SkeletonBlock className="h-8 w-48" />
                <SkeletonBlock className="mt-2 h-5 w-4/5" />
              </LoadingRegion>
              {index === 1 ? <PasswordSkeleton /> : <FormSkeleton label={label} />}
            </div>
          ),
        )}
      </div>
    );
  if (view === "developers")
    return (
      <>
        <LoadingRegion label="Loading developer search" className="mb-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <SkeletonBlock className="h-12 w-full max-w-md" />
            <div className="flex gap-2">
              <SkeletonBlock className="h-11 w-20" />
              <SkeletonBlock className="h-11 w-20" />
            </div>
          </div>
        </LoadingRegion>
        <div className="toon-card toon-paper rounded-2xl bg-panel p-4 pt-10 sm:p-8 sm:pt-12">
          <DeveloperCardsSkeleton />
        </div>
      </>
    );
  if (view === "leaderboard")
    return (
      <>
        <LoadingRegion label="Loading leaderboard controls" className="mb-6">
          <SkeletonBlock className="h-4 w-3/4" />
          <SkeletonBlock className="mt-1 h-8 w-48" />
          <div className="mt-4 flex gap-2">
            <SkeletonBlock className="h-11 w-32" />
            <SkeletonBlock className="h-11 w-28" />
          </div>
        </LoadingRegion>
        <LeaderboardSkeleton />
      </>
    );
  return (
    <>
      {showPrompt && <SubmissionPromptSkeleton />}
      <LoadingRegion label="Loading project search">
        <SkeletonBlock className="h-14 w-full" />
        <div className="mb-12 mt-6 flex flex-wrap gap-2">
          {["w-18", "w-30", "w-35", "w-24", "w-26"].map((width) => (
            <SkeletonBlock key={width} className={`h-9 ${width}`} />
          ))}
        </div>
      </LoadingRegion>
      <AppCardsSkeleton />
    </>
  );
}
