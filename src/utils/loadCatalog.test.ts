import { describe, expect, it, vi } from "vitest";
import type { AppRepo } from "../data/repositories";
import type { AppItem } from "../data/types";
import { loadCatalog, preloadCatalog } from "./loadCatalog";

describe("initial catalog loading", () => {
  it("consumes a completed startup prefetch once, then fetches fresh data on refresh", async () => {
    const items = [{ id: "ready-before-fonts" }] as AppItem[];
    const listApps = vi.fn().mockResolvedValue(items);
    const repo = { listApps } as unknown as AppRepo;
    preloadCatalog(repo, "viewer");
    await Promise.resolve();
    expect(await loadCatalog(repo, "", "All", "viewer")).toEqual([items, items]);
    expect(listApps).toHaveBeenCalledOnce();
    await loadCatalog(repo, "", "All", "viewer");
    expect(listApps).toHaveBeenCalledTimes(2);
  });

  it("never reuses another viewer's prefetched vote state", async () => {
    const listApps = vi.fn().mockResolvedValue([]);
    const repo = { listApps } as unknown as AppRepo;
    preloadCatalog(repo, "first-viewer");
    await loadCatalog(repo, "", "All", "second-viewer");
    expect(listApps).toHaveBeenCalledTimes(2);
    expect(listApps).toHaveBeenLastCalledWith({ limit: 200, userId: "second-viewer" });
  });

  it("discards expired startup results", async () => {
    const clock = vi.spyOn(Date, "now").mockReturnValue(1000);
    try {
      const listApps = vi.fn().mockResolvedValue([]);
      const repo = { listApps } as unknown as AppRepo;
      preloadCatalog(repo, "viewer");
      clock.mockReturnValue(7000);
      await loadCatalog(repo, "", "All", "viewer");
      expect(listApps).toHaveBeenCalledTimes(2);
    } finally {
      clock.mockRestore();
    }
  });

  it("downloads the unfiltered catalog once while preserving browse and ranking limits", async () => {
    const items = Array.from({ length: 150 }, (_, index) => ({ id: String(index) }) as AppItem);
    const listApps = vi.fn().mockResolvedValue(items);
    const [browse, rankings] = await loadCatalog(
      { listApps } as unknown as AppRepo,
      "  ",
      "All",
      "viewer",
    );
    expect(listApps).toHaveBeenCalledExactlyOnceWith({ limit: 200, userId: "viewer" });
    expect(browse).toEqual(items.slice(0, 100));
    expect(rankings).toEqual(items);
  });

  it("keeps searches and categories on the backend, independent of the ranking window", async () => {
    const matches = [{ id: "older-match" }] as AppItem[];
    const all = [{ id: "latest" }] as AppItem[];
    const listApps = vi.fn().mockResolvedValueOnce(all).mockResolvedValueOnce(matches);
    const result = await loadCatalog(
      { listApps } as unknown as AppRepo,
      "calendar",
      "Productivity",
      "viewer",
    );
    expect(listApps).toHaveBeenNthCalledWith(2, {
      query: "calendar",
      category: "Productivity",
      userId: "viewer",
    });
    expect(result).toEqual([matches, all]);
  });

  it("propagates catalog failures to the existing retry state", async () => {
    const listApps = vi.fn().mockRejectedValue(new Error("Could not load projects."));
    await expect(loadCatalog({ listApps } as unknown as AppRepo, "", "All")).rejects.toThrow(
      "Could not load projects.",
    );
    expect(listApps).toHaveBeenCalledOnce();
  });
});
