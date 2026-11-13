import { expect, it, vi } from "vitest";
import type { AppRepo } from "../data/repositories";
import type { AppItem } from "../data/types";
import { loadFeedProjects } from "./loadFeedProjects";

it("loads projects beyond the browse limit, including the final partial page", async () => {
  const projects = Array.from({ length: 405 }, (_, index) => ({ id: String(index) }) as AppItem);
  const listApps = vi.fn(async ({ offset = 0, limit = 200 }) =>
    projects.slice(offset, offset + limit),
  );
  expect(await loadFeedProjects({ listApps } as unknown as AppRepo, "viewer")).toEqual(projects);
  expect(listApps.mock.calls.map(([params]) => params)).toEqual([
    { limit: 200, offset: 0, userId: "viewer" },
    { limit: 200, offset: 200, userId: "viewer" },
    { limit: 200, offset: 400, userId: "viewer" },
  ]);
});

it("reports page failures instead of silently returning an incomplete catalog", async () => {
  const listApps = vi
    .fn()
    .mockResolvedValueOnce(Array.from({ length: 200 }, (_, index) => ({ id: String(index) })))
    .mockRejectedValueOnce(new Error("Could not load projects."));
  await expect(loadFeedProjects({ listApps } as unknown as AppRepo)).rejects.toThrow(
    "Could not load projects.",
  );
});
