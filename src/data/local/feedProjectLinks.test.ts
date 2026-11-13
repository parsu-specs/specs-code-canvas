import { beforeEach, expect, it, vi } from "vitest";
import { createLocalAppRepo } from "./localApps";

const store = new Map<string, string>();
vi.stubGlobal("localStorage", {
  getItem: (key: string) => store.get(key) ?? null,
  setItem: (key: string, value: string) => void store.set(key, value),
  removeItem: (key: string) => void store.delete(key),
});
vi.stubGlobal("window", { setTimeout: (callback: () => void) => setTimeout(callback, 0) });
beforeEach(() => store.clear());

it("persists a feed link to another user's project", async () => {
  const repo = createLocalAppRepo();
  const owner = { id: "owner", name: "Owner", email: "owner@example.com" };
  store.set("cc.profiles.v1", JSON.stringify([{ ...owner, role: "Member", color: "sky" }]));
  const poster = { id: "poster", name: "Poster", email: "poster@example.com" };
  const project = await repo.createApp(
    {
      title: "Community project",
      description: "A project",
      category: "Creative",
    },
    owner,
  );
  const post = await repo.postFeedPost(poster, "Check this out", project.id);
  expect(post).toMatchObject({ appId: project.id, authorId: poster.id });
  expect(await repo.listFeedPosts()).toContainEqual(
    expect.objectContaining({ id: post.id, appId: project.id }),
  );
});

it("still rejects links to projects that do not exist", async () => {
  await expect(
    createLocalAppRepo().postFeedPost(
      { id: "poster", name: "Poster", email: "poster@example.com" },
      "Check this out",
      "missing",
    ),
  ).rejects.toThrow("Project not found");
});
