import { beforeEach, describe, expect, it, vi } from "vitest";
import { createLocalAppRepo } from "./localApps";

const store = new Map<string, string>();
vi.stubGlobal("localStorage", {
  getItem: (key: string) => store.get(key) ?? null,
  setItem: (key: string, value: string) => store.set(key, value),
});
vi.stubGlobal("window", { setTimeout: (fn: () => void) => setTimeout(fn, 0) });

const author = { id: "author", name: "Author", email: "author@example.com" };

beforeEach(() => {
  store.clear();
  store.set("cc.profiles.v1", JSON.stringify([{ ...author, role: "Member", color: "sky" }]));
  store.set(
    "cc.milestones.v1",
    JSON.stringify([
      {
        id: "mine",
        authorId: author.id,
        authorName: author.name,
        body: "Update",
        createdAt: new Date().toISOString(),
        cheers: 1,
        cheeredBy: ["other"],
      },
      {
        id: "other",
        authorId: "other",
        authorName: "Other",
        body: "Keep",
        createdAt: new Date().toISOString(),
      },
    ]),
  );
  store.set(
    "cc.comments.v1",
    JSON.stringify({
      "ms:mine": [{ id: "reply", body: "Reply" }],
      "ms:other": [{ id: "keep", body: "Keep" }],
    }),
  );
});

describe("feed update deletion", () => {
  it("removes cheers, nested replies, and their likes with the feed post", async () => {
    const repo = createLocalAppRepo();
    const parent = { id: "parent", body: "Parent" };
    const reply = { id: "reply", body: "Reply", parentId: parent.id };
    const nested = { id: "nested", body: "Nested", parentId: reply.id };
    const threads = JSON.parse(store.get("cc.comments.v1")!);
    store.set("cc.comments.v1", JSON.stringify({ ...threads, "ms:mine": [parent, reply, nested] }));
    for (const c of [parent, reply, nested]) {
      await repo.toggleCommentLike("ms:mine", c.id, "other");
    }
    expect((await repo.listFeedPosts("other")).find((m) => m.id === "mine")).toMatchObject({
      cheers: 1,
      viewerHasCheered: true,
    });

    await repo.deleteFeedPost("mine", author);

    expect((await repo.listFeedPosts("other")).some((m) => m.id === "mine")).toBe(false);
    expect(await repo.listComments("ms:mine", "other")).toEqual([]);
    expect(await repo.listCommentLikers([parent.id, reply.id, nested.id])).toEqual({});
  });

  it("removes an author's update and its thread, preserving other updates", async () => {
    const repo = createLocalAppRepo();
    await repo.deleteFeedPost("mine", author);
    expect((await repo.listFeedPosts()).map((m) => m.id)).toEqual(["other"]);
    const threads = JSON.parse(store.get("cc.comments.v1")!);
    expect(threads["ms:mine"]).toBeUndefined();
    expect(threads["ms:other"]).toEqual([{ id: "keep", body: "Keep", mentions: [] }]);
  });

  it("rejects deleting another user's update without changing stored data", async () => {
    const before = new Map(store);
    await expect(createLocalAppRepo().deleteFeedPost("other", author)).rejects.toThrow(
      "own updates",
    );
    expect(store).toEqual(before);
  });
});

describe("comment deletion", () => {
  const comment = (id: string, parentId?: string) => ({
    id,
    parentId,
    appId: "thread",
    authorId: author.id,
    authorName: author.name,
    body: "Original content",
    createdAt: new Date().toISOString(),
  });

  it("clears a deleted parent's likes while preserving replies and their likes", async () => {
    store.set(
      "cc.comments.v1",
      JSON.stringify({
        thread: [comment("parent"), comment("reply", "parent"), comment("nested", "reply")],
      }),
    );
    const repo = createLocalAppRepo();
    for (const id of ["parent", "reply", "nested"]) {
      await repo.toggleCommentLike("thread", id, "other");
    }

    await repo.deleteComment("thread", "parent", author);

    expect(
      (await repo.listComments("thread", "other")).find((c) => c.id === "parent"),
    ).toMatchObject({ isDeleted: true, likes: 0, likedBy: [], viewerHasLiked: false });
    expect(await repo.listCommentLikers(["parent", "reply", "nested"])).toEqual({
      parent: [],
      reply: ["other"],
      nested: ["other"],
    });
    await expect(repo.toggleCommentLike("thread", "parent", "other")).rejects.toThrow("deleted");
    await expect(repo.toggleCommentLike("thread", "reply", "new-liker")).resolves.toMatchObject({
      likes: 2,
      viewerHasLiked: true,
    });
    await expect(repo.toggleCommentLike("thread", "nested", "new-liker")).resolves.toMatchObject({
      likes: 2,
      viewerHasLiked: true,
    });

    await repo.deleteComment("thread", "reply", author);
    await repo.deleteComment("thread", "nested", author);

    expect(await repo.listComments("thread")).toEqual([]);
    expect(await repo.listCommentLikers(["parent", "reply", "nested"])).toEqual({});
  });

  it("removes a leaf comment's likes and preserves unrelated likes", async () => {
    store.set("cc.comments.v1", JSON.stringify({ thread: [comment("leaf"), comment("keep")] }));
    const repo = createLocalAppRepo();
    await repo.toggleCommentLike("thread", "leaf", "other");
    await repo.toggleCommentLike("thread", "keep", "other");

    await repo.deleteComment("thread", "leaf", author);

    expect(await repo.listCommentLikers(["leaf", "keep"])).toEqual({ keep: ["other"] });
  });

  it("preserves the author and nested replies after deleting a parent", async () => {
    store.set(
      "cc.comments.v1",
      JSON.stringify({
        thread: [comment("parent"), comment("reply", "parent"), comment("nested", "reply")],
      }),
    );
    const repo = createLocalAppRepo();
    await repo.deleteComment("thread", "parent", author);
    const thread = await repo.listComments("thread");
    expect(thread).toHaveLength(3);
    expect(thread.find((c) => c.id === "parent")).toMatchObject({
      isDeleted: true,
      body: "Deleted comment",
      authorName: author.name,
      authorId: author.id,
    });
    expect(thread.find((c) => c.id === "nested")?.body).toBe("Original content");
    await repo.deleteComment("thread", "reply", author);
    expect((await repo.listComments("thread")).find((c) => c.id === "reply")?.isDeleted).toBe(true);
    await repo.deleteComment("thread", "nested", author);
    expect(await repo.listComments("thread")).toEqual([]);
  });

  it("removes a comment without replies entirely", async () => {
    store.set("cc.comments.v1", JSON.stringify({ thread: [comment("leaf"), comment("keep")] }));
    const repo = createLocalAppRepo();
    await repo.deleteComment("thread", "leaf", author);
    expect((await repo.listComments("thread")).map((c) => c.id)).toEqual(["keep"]);
  });

  it("rejects deleting someone else's parent and preserves its replies", async () => {
    store.set(
      "cc.comments.v1",
      JSON.stringify({ thread: [comment("parent"), comment("reply", "parent")] }),
    );
    const repo = createLocalAppRepo();
    await expect(
      repo.deleteComment("thread", "parent", { ...author, id: "other" }),
    ).rejects.toThrow("own comments");
    expect((await repo.listComments("thread")).every((c) => !c.isDeleted)).toBe(true);
  });
});

describe("comment nesting", () => {
  it.each(["project", "ms:mine"])(
    "allows four levels in %s and rejects a fifth",
    async (threadId) => {
      store.set("cc.apps.v1", JSON.stringify([{ id: "project", comments: 0 }]));
      store.set("cc.comments.v1", JSON.stringify({ [threadId]: [] }));
      const repo = createLocalAppRepo();
      const root = await repo.addComment(threadId, author, "Level one");
      const second = await repo.addComment(threadId, author, "Level two", root.id);
      const third = await repo.addComment(threadId, author, "Level three", second.id);
      const fourth = await repo.addComment(threadId, author, "Level four", third.id);
      const before = new Map(store);

      await expect(repo.addComment(threadId, author, "Level five", fourth.id)).rejects.toThrow(
        "limited to 4 levels",
      );
      expect(store).toEqual(before);
      expect(await repo.listComments(threadId)).toHaveLength(4);

      // A deleted placeholder still counts as a level, and its replies remain likeable.
      await repo.deleteComment(threadId, root.id, author);
      await expect(repo.addComment(threadId, author, "Still too deep", fourth.id)).rejects.toThrow(
        "limited to 4 levels",
      );
      await expect(repo.addComment(threadId, author, "Sibling", third.id)).resolves.toBeDefined();
      await expect(repo.toggleCommentLike(threadId, fourth.id, "other")).resolves.toMatchObject({
        likes: 1,
      });
    },
  );
});

describe("feed upvote previews", () => {
  it("resolves feed voters and refreshes after toggling an upvote", async () => {
    store.set(
      "cc.profiles.v1",
      JSON.stringify([
        { id: "other", name: "Other", color: "sky" },
        { id: author.id, name: author.name, color: "sky" },
      ]),
    );
    const repo = createLocalAppRepo();
    expect((await repo.listVoters("mine", "feedPost")).map((p) => p.id)).toEqual(["other"]);
    await repo.toggleFeedPostCheer("mine", author.id);
    expect((await repo.listVoters("mine", "feedPost")).map((p) => p.id)).toEqual([
      author.id,
      "other",
    ]);
    await repo.toggleFeedPostCheer("mine", "other");
    expect((await repo.listVoters("mine", "feedPost")).map((p) => p.id)).toEqual([author.id]);
    expect(await repo.listVoters("missing", "feedPost")).toEqual([]);
  });
});

describe("explicit vote state", () => {
  it("persists a project icon independently of screenshots and rejects invalid icons", async () => {
    const icon = "data:image/png;base64,aWNvbg==";
    const repo = createLocalAppRepo();
    const project = await repo.createApp(
      { title: "Icon project", description: "Test", category: "Creative", icon },
      author,
    );
    expect((await createLocalAppRepo().getApp(project.id))?.icon).toBe(icon);
    expect(project.screenshots).toBeUndefined();
    await expect(
      repo.createApp(
        {
          title: "Invalid",
          description: "Test",
          category: "Creative",
          icon: "javascript:alert(1)",
        },
        author,
      ),
    ).rejects.toThrow("project icon");
  });

  it("sets and clears project votes idempotently", async () => {
    const repo = createLocalAppRepo();
    const project = await repo.createApp(
      { title: "Demo", description: "Test", category: "Creative" },
      author,
    );
    const liked = await repo.setVote(project.id, author.id, true);
    expect(liked).toMatchObject({ votes: project.votes + 1, viewerHasVoted: true });
    expect(await repo.setVote(project.id, author.id, true)).toEqual(liked);
    const unliked = await repo.setVote(project.id, author.id, false);
    expect(unliked).toMatchObject({ votes: project.votes, viewerHasVoted: false });
    expect(await repo.setVote(project.id, author.id, false)).toEqual(unliked);
  });

  it("sets and clears feed upvotes without removing another user's vote", async () => {
    const repo = createLocalAppRepo();
    const liked = await repo.setFeedPostCheer("mine", author.id, true);
    expect(liked).toMatchObject({ cheers: 2, viewerHasCheered: true });
    expect(await repo.setFeedPostCheer("mine", author.id, true)).toEqual(liked);
    const unliked = await repo.setFeedPostCheer("mine", author.id, false);
    expect(unliked).toMatchObject({ cheers: 1, viewerHasCheered: false });
    expect(await repo.setFeedPostCheer("mine", author.id, false)).toEqual(unliked);
  });
});
