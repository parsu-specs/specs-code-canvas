import { beforeEach, describe, expect, it, vi } from "vitest";
import { createLocalAppRepo } from "./localApps";
import { createLocalProfileRepo } from "./localProfiles";

const store = new Map<string, string>();
vi.stubGlobal("localStorage", {
  getItem: (k: string) => (store.has(k) ? (store.get(k) as string) : null),
  setItem: (k: string, v: string) => void store.set(k, String(v)),
  removeItem: (k: string) => void store.delete(k),
});
vi.stubGlobal("window", {
  setTimeout: (fn: (...args: unknown[]) => void, ms?: number) => setTimeout(fn, ms),
});

beforeEach(() => {
  store.clear();
});

describe("updateProfile name guard", () => {
  it("starts new accounts as Guest and rejects role changes", async () => {
    const repo = createLocalProfileRepo();
    const user = { id: "new-guest", name: "New Guest", email: "guest@example.com" };
    expect((await repo.ensureUserProfile(user)).role).toBe("Guest");
    await expect(
      repo.updateProfile(user.id, JSON.parse('{"role":"Member"}'), user.id),
    ).rejects.toThrow("admin console");
    expect((await repo.getProfile(user.id)).role).toBe("Guest");
    await expect(
      createLocalAppRepo().createApp(
        { title: "Guest project", description: "Test", category: "Creative" },
        user,
      ),
    ).rejects.toThrow("approve");
    await expect(createLocalAppRepo().postFeedPost(user, "Guest feed post")).resolves.toMatchObject(
      { body: "Guest feed post" },
    );
  });
  it("palette-only saves succeed despite a same-named duplicate row", async () => {
    const repo = createLocalProfileRepo();
    const all = await repo.listProfiles();
    const [a] = all;
    // Forge the duplicate-row situation (Google-linking orphans): two rows,
    // one display name. Old code rejected EVERY save with "already taken".
    const raw = JSON.parse(store.get("cc.profiles.v1") as string) as Array<Record<string, unknown>>;
    const dup = { ...raw[1], id: "dup-1", name: (raw[0] as { name: string }).name };
    store.set("cc.profiles.v1", JSON.stringify([...raw, dup]));
    const updated = await repo.updateProfile(a.id, { palette: "ocean" }, a.id);
    expect(updated.palette).toBe("ocean");
  });

  it("renames to a taken name still fail", async () => {
    const repo = createLocalProfileRepo();
    const all = await repo.listProfiles();
    const [a, b] = all;
    await expect(repo.updateProfile(a.id, { name: b.name }, a.id)).rejects.toThrow("already taken");
  });

  it("creating a profile with a taken name fails", async () => {
    const repo = createLocalProfileRepo();
    const all = await repo.listProfiles();
    const [a] = all;
    await expect(
      repo.ensureUserProfile({ id: "brand-new", email: "n@x.com", name: a.name }),
    ).rejects.toThrow("already taken");
  });
});

describe("mention persistence across renames", () => {
  it("keeps comment and description bindings through reloads, edits and name reuse", async () => {
    const profiles = createLocalProfileRepo();
    const [original] = await profiles.listProfiles();
    const stored = JSON.parse(store.get("cc.profiles.v1")!) as Array<{ id: string; role: string }>;
    store.set(
      "cc.profiles.v1",
      JSON.stringify(stored.map((p) => (p.id === original.id ? { ...p, role: "Member" } : p))),
    );
    const author = { id: original.id, name: original.name, email: "test@example.com" };
    const apps = createLocalAppRepo();
    const text = `Thanks @${original.name}!`;
    const app = await apps.createApp(
      { title: "Mentions", description: text, category: "Creative" },
      author,
    );
    const comment = await apps.addComment(app.id, author, text);
    const expected = [{ name: original.name, userId: original.id }];
    expect(app.mentions).toEqual(expected);
    expect(comment.mentions).toEqual(expected);
    await profiles.updateProfile(original.id, { name: "Renamed Developer" }, original.id);
    await profiles.ensureUserProfile({
      id: "new-owner",
      name: original.name,
      email: "other@example.com",
    });
    const reloaded = createLocalAppRepo();
    expect((await reloaded.listComments(app.id))[0].mentions).toEqual(expected);
    expect((await reloaded.getApp(app.id)).mentions).toEqual(expected);
    const edited = await reloaded.updateApp(app.id, author, {
      description: text + " More details.",
    });
    expect(edited.description).toBe(text + " More details.");
    expect(edited.mentions).toEqual(expected);
  });

  it("freezes legacy content before a rename without rewriting it", async () => {
    const profiles = createLocalProfileRepo();
    const [original] = await profiles.listProfiles();
    const text = `Thanks @${original.name}!`;
    store.set("cc.apps.v1", JSON.stringify([{ id: "legacy", description: text }]));
    store.set("cc.comments.v1", JSON.stringify({ legacy: [{ body: text }] }));
    await profiles.updateProfile(original.id, { name: "New Display Name" }, original.id);
    const app = JSON.parse(store.get("cc.apps.v1")!)[0];
    const comment = JSON.parse(store.get("cc.comments.v1")!).legacy[0];
    expect(app.description).toBe(text);
    expect(comment.body).toBe(text);
    expect(app.mentions).toEqual([{ name: original.name, userId: original.id }]);
    expect(comment.mentions).toEqual(app.mentions);
  });
});
