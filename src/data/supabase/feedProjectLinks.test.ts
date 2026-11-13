import { expect, it, vi } from "vitest";
import { createSupabaseAppRepo } from "./supabaseRepos";
import { getSupabase } from "./client";

vi.mock("./client", () => ({ getSupabase: vi.fn() }));
const poster = { id: "poster", name: "Poster", email: "poster@example.com" };

function mockProject(exists: boolean) {
  const insert = vi.fn((row: Record<string, unknown>) => ({
    select: () => ({
      single: async () => ({ data: { ...row, created_at: "2026-11-13T00:00:00Z" }, error: null }),
    }),
  }));
  const select = vi.fn(() => ({
    eq: () => ({
      single: async () => ({
        data: exists ? { id: "community", creator_id: "someone-else", creator: "Sam" } : null,
        error: null,
      }),
    }),
  }));
  vi.mocked(getSupabase).mockReturnValue({
    from: (table: string) => (table === "apps" ? { select } : { insert }),
  } as unknown as ReturnType<typeof getSupabase>);
  return { insert, select };
}

it("links another user's project while preserving the post's author", async () => {
  const { insert, select } = mockProject(true);
  const result = await createSupabaseAppRepo().postFeedPost(poster, "Check this out", "community");
  expect(select).toHaveBeenCalledWith("id");
  expect(insert).toHaveBeenCalledWith(
    expect.objectContaining({ app_id: "community", author_id: "poster" }),
  );
  expect(result).toMatchObject({ appId: "community", authorId: "poster" });
});

it("does not insert a post when the linked project no longer exists", async () => {
  const { insert } = mockProject(false);
  await expect(
    createSupabaseAppRepo().postFeedPost(poster, "Check this out", "missing"),
  ).rejects.toThrow("Project not found");
  expect(insert).not.toHaveBeenCalled();
});
