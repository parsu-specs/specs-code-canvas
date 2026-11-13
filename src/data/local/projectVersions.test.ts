import { beforeEach, describe, expect, it, vi } from "vitest";
import { createLocalAppRepo } from "./localApps";

const store = new Map<string, string>();
vi.stubGlobal("localStorage", {
  getItem: (key: string) => store.get(key) ?? null,
  setItem: (key: string, value: string) => void store.set(key, value),
  removeItem: (key: string) => void store.delete(key),
});
vi.stubGlobal("window", { setTimeout: (callback: () => void) => setTimeout(callback, 0) });
const owner = { id: "version-owner", name: "Version Owner", email: "owner@example.com" };
const input = {
  title: "Prototype",
  description: "Initial design",
  category: "Creative" as const,
  stage: "Visual prototype" as const,
  version: "v0.1",
  screenshots: ["https://example.com/first.webp"],
  docs: "Initial docs",
};
beforeEach(() => {
  store.clear();
  store.set("cc.profiles.v1", JSON.stringify([{ ...owner, role: "Member", color: "sky" }]));
});

describe("project publications", () => {
  it("rejects an overlapping publication instead of overwriting the winning history", async () => {
    const repo = createLocalAppRepo();
    const first = await repo.createApp(input, owner);
    const publication = { notes: "Concurrent update", expectedPublication: first.lastPublishedAt };
    const results = await Promise.allSettled([
      repo.updateApp(first.id, owner, { stage: "Beta", version: "v0.2", publication }),
      repo.updateApp(first.id, owner, { stage: "Released", version: "v1.0", publication }),
    ]);
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((result) => result.status === "rejected")).toHaveLength(1);
    expect((await repo.getApp(first.id)).versions).toHaveLength(2);
  });
  it("keeps the first snapshot intact through detail edits and publishes a new snapshot on the same project", async () => {
    const repo = createLocalAppRepo();
    const first = await repo.createApp(input, owner);
    expect(first.versions).toHaveLength(1);
    const edited = await repo.updateApp(first.id, owner, {
      title: "Corrected title",
      screenshots: ["https://example.com/new.webp"],
    });
    expect(edited.versions).toEqual(first.versions);
    expect(edited.lastPublishedAt).toBe(first.lastPublishedAt);
    const published = await repo.updateApp(first.id, owner, {
      stage: "Working prototype",
      version: "v0.2",
      docs: "Working docs",
      publication: {
        notes: "Core interactions now work",
        expectedPublication: first.lastPublishedAt,
      },
    });
    expect(published.id).toBe(first.id);
    expect(published.votes).toBe(first.votes);
    expect(published.comments).toBe(first.comments);
    expect(published.versions).toHaveLength(2);
    expect(published.versions?.[0]).toMatchObject({
      stage: "Working prototype",
      version: "v0.2",
      notes: "Core interactions now work",
      snapshot: {
        title: "Corrected title",
        docs: "Working docs",
        screenshots: ["https://example.com/new.webp"],
      },
    });
    expect(published.versions?.[1].snapshot).toMatchObject({
      title: "Prototype",
      docs: "Initial docs",
      screenshots: input.screenshots,
    });
    expect((await createLocalAppRepo().getApp(first.id)).versions).toEqual(published.versions);
  });

  it("rejects duplicate labels, stale publications, invalid notes, and unauthorized updates without changing history", async () => {
    const repo = createLocalAppRepo();
    const first = await repo.createApp(input, owner);
    const publication = { notes: "Update", expectedPublication: first.lastPublishedAt };
    await expect(
      repo.updateApp(first.id, owner, { stage: "Beta", version: "0.1", publication }),
    ).rejects.toThrow("already exists");
    await expect(
      repo.updateApp(first.id, owner, {
        stage: "Beta",
        version: "v0.2",
        publication: { ...publication, notes: "  " },
      }),
    ).rejects.toThrow("Describe what changed");
    await expect(
      repo.updateApp(
        first.id,
        { ...owner, id: "someone-else" },
        { stage: "Beta", version: "v0.2", publication },
      ),
    ).rejects.toThrow("own projects");
    const second = await repo.updateApp(first.id, owner, {
      stage: "Beta",
      version: "v0.2",
      publication,
    });
    await expect(
      repo.updateApp(first.id, owner, { stage: "Released", version: "v1.0", publication }),
    ).rejects.toThrow("Reload");
    await expect(repo.updateApp(first.id, owner, { version: "v2.0" })).rejects.toThrow(
      "Publish an update",
    );
    expect((await repo.getApp(first.id)).versions).toEqual(second.versions);
  });

  it("does not invent history for existing projects and lets their owners publish a first version", async () => {
    const repo = createLocalAppRepo();
    const first = await repo.createApp(input, owner);
    const legacy = {
      ...first,
      stage: undefined,
      version: undefined,
      versions: undefined,
      lastPublishedAt: undefined,
    };
    store.set("cc.apps.v1", JSON.stringify([legacy]));
    const loaded = await repo.getApp(first.id);
    expect(loaded.stage).toBeUndefined();
    expect(loaded.versions).toBeUndefined();
    const published = await repo.updateApp(first.id, owner, {
      stage: "Released",
      version: "v1.0",
      publication: { notes: "First tracked release" },
    });
    expect(published.versions).toHaveLength(1);
    expect(published.createdAt).toBe(first.createdAt);
  });
});
