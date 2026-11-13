import type { AppRepo } from "../data/repositories";
import type { AppItem } from "../data/types";

/** The browse catalog is capped at 200; linking must include older projects too. */
export async function loadFeedProjects(repo: AppRepo, userId?: string) {
  const projects = new Map<string, AppItem>();
  const pageSize = 200;
  for (let offset = 0; ; offset += pageSize) {
    const page = await repo.listApps({ limit: pageSize, offset, userId });
    for (const project of page) projects.set(project.id, project);
    if (page.length < pageSize) return [...projects.values()];
  }
}
