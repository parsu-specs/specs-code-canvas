import type { MouseEvent } from "react";

export const ROUTES = {
  home: "/",
  about: "/about",
  signin: "/signin",
  discover: "/discover",
  developers: "/developers",
  feeds: "/feeds",
  leaderboard: "/leaderboard",
  profile: "/profile",
  settings: "/settings",
  apps: "/apps",
} as const;

export function appDetailsPath(appId: string) {
  return `${ROUTES.apps}/${encodeURIComponent(appId)}`;
}

export function developerProfilePath(username: string) {
  return `${ROUTES.developers}/${encodeURIComponent(username)}`;
}

export function normalizePathname(pathname: string) {
  const clean = pathname.replace(/\/+$/g, "") || ROUTES.home;
  if (clean === "/landing" || clean === "/home") return ROUTES.home;
  if (["/feed", "/community", "/milestones"].includes(clean)) return ROUTES.feeds;
  return clean;
}

/** Resolve canonical URLs and authentication without changing the public home page. */
export function resolveRoute(pathname: string, signedIn: boolean) {
  const path = normalizePathname(pathname);
  if (signedIn && path === ROUTES.signin) return ROUTES.discover;
  if (!signedIn && isProtectedRoute(path)) return ROUTES.signin;
  return path;
}

export function isProtectedRoute(pathname: string) {
  const clean = normalizePathname(pathname);
  return (
    clean === ROUTES.discover ||
    clean === ROUTES.signin ||
    clean === ROUTES.profile ||
    clean === ROUTES.settings ||
    clean === ROUTES.leaderboard ||
    clean === ROUTES.feeds ||
    clean === ROUTES.developers ||
    clean.startsWith(`${ROUTES.developers}/`) ||
    clean.startsWith(`${ROUTES.discover}/`) ||
    clean.startsWith(`${ROUTES.apps}/`)
  );
}
/** Navigate between standalone pages and the app without reloading the session. */
export function navigateInternalLink(event: MouseEvent<HTMLAnchorElement>) {
  if (
    event.defaultPrevented ||
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey ||
    event.currentTarget.target === "_blank"
  )
    return;
  event.preventDefault();
  window.history.pushState({}, "", event.currentTarget.href);
  window.dispatchEvent(new PopStateEvent("popstate"));
  window.scrollTo({ top: 0 });
}
