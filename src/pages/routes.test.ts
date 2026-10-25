import { describe, expect, it } from "vitest";
import {
  ROUTES,
  appDetailsPath,
  developerProfilePath,
  isProtectedRoute,
  normalizePathname,
  resolveRoute,
} from "./routes";

describe("routes", () => {
  it("normalizes trailing slashes and the root path", () => {
    expect(normalizePathname(`${ROUTES.discover}///`)).toBe(ROUTES.discover);
    expect(normalizePathname("///")).toBe(ROUTES.home);
  });

  it("builds encoded application and developer paths", () => {
    expect(appDetailsPath("app / one")).toBe("/apps/app%20%2F%20one");
    expect(developerProfilePath("Alex / One")).toBe("/developers/Alex%20%2F%20One");
  });

  it("recognizes protected routes and the legacy community route", () => {
    expect(isProtectedRoute(ROUTES.discover)).toBe(true);
    expect(isProtectedRoute(appDetailsPath("app-1"))).toBe(true);
    expect(isProtectedRoute(developerProfilePath("profile-1"))).toBe(true);
    expect(isProtectedRoute("/community")).toBe(true);
    expect(isProtectedRoute(ROUTES.home)).toBe(false);
  });
  it.each(["/", "/home", "/landing", "/landing/"])(
    "keeps %s on public Home for every session",
    (path) => {
      expect(resolveRoute(path, false)).toBe(ROUTES.home);
      expect(resolveRoute(path, true)).toBe(ROUTES.home);
    },
  );

  it.each(["/feeds", "/feed", "/community", "/milestones", "/feed/"])(
    "canonicalizes %s and protects Feeds",
    (path) => {
      expect(normalizePathname(path)).toBe(ROUTES.feeds);
      expect(resolveRoute(path, true)).toBe(ROUTES.feeds);
      expect(resolveRoute(path, false)).toBe(ROUTES.signin);
    },
  );

  it("sends signed-in users from sign-in to Discover", () => {
    expect(resolveRoute(ROUTES.signin, true)).toBe(ROUTES.discover);
    expect(resolveRoute(ROUTES.discover, false)).toBe(ROUTES.signin);
  });
});
