import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import Brand from "../src/components/Brand.tsx";
import {
  SkeletonBlock,
  SkeletonDelayContext,
  StoreContentSkeleton,
  FormSkeleton,
} from "../src/components/Skeleton.tsx";

const el = React.createElement;

/** Only public branding and placeholders are rendered here; no session data. */
export function startupShell() {
  const brand = el(Brand, { compact: true, light: true });
  const bars = el(
    "div",
    { className: "mt-12 hidden space-y-5 lg:block" },
    ...[0, 1, 2, 3, 4].map((key) =>
      el(SkeletonBlock, { key, className: "h-11 w-full bg-brand-foreground/20" }),
    ),
  );
  const store = el(
    "div",
    { "data-startup-store": "", className: "startup-placeholder min-h-screen overflow-x-clip" },
    el(
      "aside",
      {
        className:
          "halloween-sidebar fixed inset-x-0 top-0 h-21.25 border-b-[3px] border-outline bg-brand-surface px-4 py-5 lg:inset-y-0 lg:right-auto lg:h-screen lg:w-70 lg:border-b-0 lg:border-r-[3px] lg:p-7",
      },
      brand,
      bars,
    ),
    el("div", {
      className:
        "fixed inset-x-0 top-0 hidden h-21.25 border-b-[3px] border-outline bg-panel lg:left-70 lg:block",
    }),
    el(
      "div",
      { className: "px-4 pb-24 pt-27.25 sm:px-8 sm:pt-29.25 lg:ml-70 lg:p-10 lg:pt-31.25" },
      el(
        "div",
        { className: "mx-auto max-w-6xl" },
        ...["discover", "developers", "leaderboard", "feeds", "profile", "project", "settings"].map(
          (view) => {
            const heading = ["discover", "developers", "leaderboard", "settings"].includes(view);
            return el(
              "div",
              { key: view, "data-startup-view": view },
              heading ? el(SkeletonBlock, { className: "h-8 w-44 sm:h-9" }) : null,
              heading ? el(SkeletonBlock, { className: "mt-2 hidden h-6 w-2/3 sm:block" }) : null,
              el(
                "div",
                { className: `@container/content ${heading ? "mt-5 sm:mt-6" : ""}` },
                el(StoreContentSkeleton, { view }),
              ),
            );
          },
        ),
      ),
    ),
    el("div", {
      className:
        "fixed inset-x-0 bottom-0 h-[calc(4.5rem+env(safe-area-inset-bottom,0px))] border-t-2 border-outline bg-brand-surface lg:hidden",
    }),
  );
  const publicShell = el(
    "div",
    {
      "data-startup-public": "",
      className: "startup-placeholder min-h-screen px-4 pt-27.25 sm:px-8 sm:pt-29.25 lg:pt-31.25",
    },
    el(
      "div",
      { className: "fixed inset-x-0 top-0 h-21.25 border-b-[3px] border-outline bg-primary p-5" },
      brand,
    ),
    el(
      "div",
      { "data-startup-hero": "", className: "mx-auto grid max-w-6xl gap-8 pt-12 md:grid-cols-2" },
      el(
        "div",
        { className: "space-y-6" },
        el(SkeletonBlock, { className: "h-14 w-4/5" }),
        el(SkeletonBlock, { className: "h-14 w-full" }),
        el(SkeletonBlock, { className: "h-24 w-full" }),
      ),
      el(SkeletonBlock, { className: "h-80 w-full rounded-2xl" }),
    ),
    el(
      "div",
      {
        "data-startup-signin": "",
        className:
          "toon-card toon-paper mx-auto mt-10 max-w-lg rounded-2xl bg-panel p-6 pt-10 sm:p-8 sm:pt-12",
      },
      el(SkeletonBlock, { className: "h-9 w-48" }),
      el(SkeletonBlock, { className: "mt-3 h-5 w-4/5" }),
      el(FormSkeleton, { label: "Loading sign-in form" }),
    ),
  );
  return renderToStaticMarkup(
    el(
      SkeletonDelayContext.Provider,
      { value: 0 },
      el("div", { "data-startup-shell": "", "aria-hidden": true }, store, publicShell),
    ),
  );
}
