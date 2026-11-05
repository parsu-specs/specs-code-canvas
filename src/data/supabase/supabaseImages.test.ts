import { beforeEach, expect, it, vi } from "vitest";
import { createSupabaseAppRepo } from "./supabaseRepos";
import { getSupabase } from "./client";

vi.mock("./client", () => ({ getSupabase: vi.fn() }));
const select = vi.fn();
const range = vi.fn();
beforeEach(() => {
  vi.clearAllMocks();
  const query = { select, range, order: vi.fn(() => query) };
  select.mockReturnValue(query);
  vi.mocked(getSupabase).mockReturnValue({
    from: (table: string) =>
      table === "apps"
        ? query
        : {
            select: () => ({
              eq: () => ({ in: async () => ({ data: [] }) }),
              in: async () => ({ data: [] }),
            }),
          },
  } as never);
});

it("requests one screenshot and no documentation for catalog cards", async () => {
  range.mockResolvedValue({
    data: [{ id: "a1", title: "App", screenshots: "https://images.example/first.webp" }],
    error: null,
  });
  const apps = await createSupabaseAppRepo().listApps({ userId: "viewer" });
  expect(select.mock.calls[0][0]).toContain("screenshots:screenshots->0");
  expect(select.mock.calls[0][0]).not.toContain("docs");
  expect(apps[0].screenshots).toEqual(["https://images.example/first.webp"]);
  expect(apps[0].docs).toBeUndefined();
});

it("handles rows with no first screenshot", async () => {
  range.mockResolvedValue({ data: [{ id: "a1", screenshots: null }], error: null });
  const apps = await createSupabaseAppRepo().listApps({ userId: "viewer" });
  expect(apps[0].screenshots).toBeUndefined();
});

it("preserves the empty and failed catalog states", async () => {
  range
    .mockResolvedValueOnce({ data: [], error: null })
    .mockResolvedValueOnce({ data: null, error: { message: "Catalog unavailable" } });
  expect(await createSupabaseAppRepo().listApps({ userId: "viewer" })).toEqual([]);
  await expect(createSupabaseAppRepo().listApps({ userId: "viewer" })).rejects.toThrow(
    "Catalog unavailable",
  );
});
