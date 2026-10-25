import React, { Suspense, useEffect, useState } from "react";
import { lazyPage } from "../utils/lazyPage";
import { useAuth } from "../auth/authContext";
import { ROUTES, isProtectedRoute, normalizePathname, resolveRoute } from "./routes";
import { consumeSharedDestination, rememberSharedDestination } from "../utils/sharedDestination";

// Route-split: each page (and its heavy deps like markdown/GitHub readers)
// loads on demand instead of inflating the first paint.
const Login = lazyPage(() => import("./Login"));
const Store = lazyPage(() => import("./Store"));
const PublicSite = lazyPage(() => import("./PublicSite"));

function PageLoader() {
  return (
    <main className="min-w-0 grid min-h-screen place-items-center max-w-full">
      <div
        className="min-w-0 flex min-h-screen items-center justify-center gap-2 *:min-w-0 max-w-full"
        role="status"
        aria-label="Loading CodeCanvas"
      >
        <span className="size-3 animate-loader-bounce rounded-full border-2 border-outline bg-secondary motion-reduce:animate-none" />
        <span className="size-3 animate-loader-bounce rounded-full border-2 border-outline bg-accent [animation-delay:120ms] motion-reduce:animate-none" />
        <span className="size-3 animate-loader-bounce rounded-full border-2 border-outline bg-success [animation-delay:240ms] motion-reduce:animate-none" />
      </div>
    </main>
  );
}

function currentPath() {
  return normalizePathname(window.location.pathname);
}

export default function Main() {
  const { user, loading } = useAuth();
  const [path, setPath] = useState(currentPath());

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

  if (loading) return <PageLoader />;

  const normalizedPath = normalizePathname(path);

  let page: React.ReactNode;
  if (normalizedPath === ROUTES.about || normalizedPath === ROUTES.home)
    page = <PublicSite page={normalizedPath === ROUTES.about ? "about" : "home"} />;
  else if (user) page = <Store key={user.id} />;
  else if (isProtectedRoute(normalizedPath) || normalizedPath === ROUTES.signin) page = <Login />;
  else page = <PublicSite page="home" />;

  return (
    <main className="min-h-screen">
      <Suspense fallback={<PageLoader />}>{page}</Suspense>
    </main>
  );
}
