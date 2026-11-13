import React, { Suspense, useEffect, useLayoutEffect, useRef, useState } from "react";
import { lazyPage } from "../utils/lazyPage";
import { useAuth } from "../auth/authContext";
import { ROUTES, isProtectedRoute, normalizePathname, resolveRoute } from "./routes";
import { consumeSharedDestination, rememberSharedDestination } from "../utils/sharedDestination";
import { activeViewerId } from "../utils/viewerCache";
import {
  FormSkeleton,
  LoadingRegion,
  SkeletonBlock,
  StoreContentSkeleton,
  SkeletonDelayContext,
} from "../components/Skeleton";
import { getAppRepo } from "../data/factory";
import { preloadCatalog } from "../utils/loadCatalog";
import Brand from "../components/Brand";

// Route-split: each page (and its heavy deps like markdown/GitHub readers)
// loads on demand instead of inflating the first paint.
const Login = lazyPage(() => import("./Login"));
const Store = lazyPage(() => import("./Store"));
const PublicSite = lazyPage(() => import("./PublicSite"));

/** Download the likely route while fonts and the verified session are loading. */
export function preloadInitialPage() {
  const path = currentPath();
  const page =
    path === ROUTES.home || path === ROUTES.about ? PublicSite : activeViewerId() ? Store : Login;
  // Rendering still goes through Suspense/ErrorBoundary if a download fails.
  void page.preload().catch(() => undefined);
}

function PageLoader({ store = false }: { store?: boolean }) {
  const [delay] = useState(() =>
    document.querySelector("[data-startup-shell]") && performance.now() > 180 ? 0 : 180,
  );
  const path = currentPath();
  const view =
    path.startsWith("/apps/") || path.startsWith("/discover/")
      ? "project"
      : path.startsWith("/developers/") || path === ROUTES.profile
        ? "profile"
        : path === ROUTES.feeds
          ? "feeds"
          : path === ROUTES.developers
            ? "developers"
            : path === ROUTES.leaderboard
              ? "leaderboard"
              : path === ROUTES.settings
                ? "settings"
                : "discover";
  const heading = ["discover", "developers", "leaderboard", "settings"].includes(view);
  let showPrompt = true;
  try {
    showPrompt =
      localStorage.getItem(
        `codecanvas:submission-prompt:${import.meta.env.VITE_SUPABASE_URL ?? "local"}:${activeViewerId() ?? "visitor"}`,
      ) !== "hidden";
  } catch {
    /* The placeholder stays generic when storage is unavailable. */
  }
  if (store)
    return (
      <LoadingRegion
        label="Loading CodeCanvas"
        delay={delay}
        className="min-h-screen overflow-x-clip"
      >
        <SkeletonDelayContext.Provider value={0}>
          <div className="halloween-sidebar fixed inset-x-0 top-0 z-40 h-header border-b-[3px] border-outline bg-brand-surface px-4 py-5 lg:inset-y-0 lg:right-auto lg:h-screen lg:w-sidebar lg:border-b-0 lg:border-r-[3px] lg:p-7">
            <Brand compact light />
            <div className="mt-12 hidden space-y-5 lg:block">
              {[0, 1, 2, 3].map((index) => (
                <SkeletonBlock key={index} className="h-11 w-full bg-brand-foreground/20" />
              ))}
            </div>
          </div>
          <div className="fixed inset-x-0 top-0 hidden h-header border-b-[3px] border-outline bg-panel lg:left-sidebar lg:block" />
          <div className="px-4 pt-[calc(var(--spacing-header)+1.5rem)] sm:px-8 sm:pt-[calc(var(--spacing-header)+2rem)] lg:ml-sidebar lg:p-10 lg:pt-[calc(var(--spacing-header)+2.5rem)]">
            <div className="mx-auto max-w-6xl">
              {heading && (
                <>
                  <SkeletonBlock className="h-8 w-44 sm:h-9" />
                  <SkeletonBlock className="mt-2 hidden h-6 w-2/3 sm:block" />
                </>
              )}
              <div className={`@container/content ${heading ? "mt-5 sm:mt-6" : ""}`}>
                <StoreContentSkeleton view={view} showPrompt={showPrompt} />
              </div>
            </div>
          </div>
          <div className="fixed inset-x-0 bottom-0 h-[calc(4.5rem+env(safe-area-inset-bottom,0px))] border-t-2 border-outline bg-brand-surface lg:hidden" />
        </SkeletonDelayContext.Provider>
      </LoadingRegion>
    );
  return (
    <LoadingRegion
      label="Loading CodeCanvas"
      delay={delay}
      className="min-h-screen min-w-0 px-4 pb-8 pt-[calc(var(--spacing-header)+1.5rem)] sm:px-8 sm:pt-[calc(var(--spacing-header)+2rem)] lg:pt-[calc(var(--spacing-header)+2.5rem)]"
    >
      <div className="fixed inset-x-0 top-0 h-header border-b-[3px] border-outline bg-primary p-5">
        <Brand compact onPrimary />
      </div>
      {path === ROUTES.home || path === ROUTES.about ? (
        <div className="mx-auto grid max-w-6xl gap-8 pt-12 md:grid-cols-2">
          <div className="space-y-6">
            <SkeletonBlock className="h-14 w-4/5" />
            <SkeletonBlock className="h-14 w-full" />
            <SkeletonBlock className="h-24 w-full" />
            <SkeletonBlock className="h-12 w-44" />
          </div>
          <SkeletonBlock className="h-80 w-full rounded-2xl" />
        </div>
      ) : (
        <div className="toon-card toon-paper mx-auto mt-10 max-w-lg bg-panel p-6 pt-10 sm:p-8 sm:pt-12">
          <SkeletonBlock className="h-9 w-48" />
          <SkeletonBlock className="mt-3 h-5 w-4/5" />
          <FormSkeleton label="Loading sign-in form" />
        </div>
      )}
    </LoadingRegion>
  );
}

function currentPath() {
  return normalizePathname(window.location.pathname);
}

export default function Main({ fontsReady = true }: { fontsReady?: boolean }) {
  const { user, loading } = useAuth();
  const [path, setPath] = useState(currentPath());
  const catalogViewer = useRef<string | null>(null);

  // Start before Store's passive loading effect, including when its chunk is cached.
  useLayoutEffect(() => {
    if (loading) return;
    if (!user) {
      catalogViewer.current = null;
      return;
    }
    if (!isProtectedRoute(path) || catalogViewer.current === user.id) return;
    catalogViewer.current = user.id;
    if (path === ROUTES.discover) preloadCatalog(getAppRepo(), user.id);
  }, [loading, user?.id, path]);

  useEffect(() => {
    const onPopState = () => setPath(currentPath());
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    if (loading) return;

    const current = window.location.pathname;
    if (!user) rememberSharedDestination(current);
    const sharedDestination = user ? consumeSharedDestination() : null;
    const destination =
      sharedDestination && (current === ROUTES.signin || current === ROUTES.discover)
        ? sharedDestination
        : resolveRoute(current, Boolean(user));

    if (destination !== current) {
      window.history.replaceState(
        {},
        "",
        `${destination}${window.location.search}${window.location.hash}`,
      );
      window.dispatchEvent(new PopStateEvent("popstate"));
    }
    if (destination !== path) setPath(destination);
  }, [loading, path, user]);

  if (loading || !fontsReady)
    return <PageLoader store={isProtectedRoute(path) && Boolean(activeViewerId())} />;

  const normalizedPath = normalizePathname(path);

  let page: React.ReactNode;
  if (normalizedPath === ROUTES.about || normalizedPath === ROUTES.home)
    page = <PublicSite page={normalizedPath === ROUTES.about ? "about" : "home"} />;
  else if (user) page = <Store key={user.id} />;
  else if (isProtectedRoute(normalizedPath) || normalizedPath === ROUTES.signin) page = <Login />;
  else page = <PublicSite page="home" />;

  return (
    <main className="min-h-screen">
      <Suspense fallback={<PageLoader store={Boolean(user) && isProtectedRoute(normalizedPath)} />}>
        {page}
      </Suspense>
    </main>
  );
}
