import type { AppRepo } from "../data/repositories";
import type { CategoryFilter } from "../data/types";

let startup: {
  repo: AppRepo;
  userId: string;
  expiresAt: number;
  promise: ReturnType<AppRepo["listApps"]>;
} | null = null;

/** Called after session restoration, overlapping route downloads and the font guard. */
export function preloadCatalog(repo: AppRepo, userId: string) {
  if (startup?.repo === repo && startup.userId === userId && startup.expiresAt > Date.now()) return;
  const entry = {
    repo,
    userId,
    expiresAt: Date.now() + 5000,
    promise: repo.listApps({ limit: 200, userId }),
  };
  startup = entry;
  void entry.promise.catch(() => {
    if (startup === entry) startup = null;
  });
}

/** Keep the 100-result browse limit without downloading the initial catalog twice. */
export async function loadCatalog(
  repo: AppRepo,
  query: string,
  category: CategoryFilter,
  userId?: string,
) {
  const preloaded =
    startup?.repo === repo && startup.userId === userId && startup.expiresAt > Date.now()
      ? startup.promise
      : null;
  if (preloaded) startup = null;
  const all = preloaded ?? repo.listApps({ limit: 200, userId });
  const filtered =
    !query.trim() && category === "All"
      ? all.then((items) => items.slice(0, 100))
      : repo.listApps({ query, category, userId });
  return Promise.all([filtered, all]);
}
