import { createClient } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NotFoundError } from "../repositories";
import { getSupabase } from "./client";
import { createSupabaseProfileRepo } from "./supabaseRepos";

vi.mock("./client", () => ({ getSupabase: vi.fn() }));

const requests: Request[] = [];
let rows: Record<string, unknown>[] = [];
let failRead = false;

beforeEach(() => {
  requests.length = 0;
  rows = [];
  failRead = false;
  const client = createClient("https://profiles.example.test", "test-anon-key", {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: {
      fetch: async (input, init) => {
        const request = new Request(input, init);
        requests.push(request);
        if (request.method === "POST") {
          rows.push({ ...(await request.json()), created_at: "2026-11-14T00:00:00Z" });
          return new Response(null, { status: 201 });
        }
        if (failRead)
          return Response.json({ message: "Profile lookup unavailable" }, { status: 403 });
        const filter = new URL(request.url).searchParams.get("id") ?? "";
        const value = filter.replace(/^(eq|ilike)\./, "");
        const matches = rows.filter((row) =>
          filter.startsWith("eq.")
            ? String(row.id) === value
            : String(row.id).toLowerCase() === value.toLowerCase(),
        );
        if (request.headers.get("Accept") === "application/vnd.pgrst.object+json") {
          return matches.length === 1
            ? Response.json(matches[0])
            : Response.json(
                { code: "PGRST116", message: "Cannot coerce the result to a single JSON object" },
                { status: 406 },
              );
        }
        return Response.json(matches);
      },
    },
  });
  vi.mocked(getSupabase).mockReturnValue(client);
});

describe("new account profile lookups", () => {
  it("treats a new Google account as missing without issuing a singular request that returns 406", async () => {
    const repo = createSupabaseProfileRepo();
    await expect(repo.getProfile("new-google")).rejects.toBeInstanceOf(NotFoundError);
    await expect(
      repo.ensureUserProfile({
        id: "new-google",
        email: "alex@example.com",
        name: "Alex Reyes",
        requiresProfileSetup: true,
      }),
    ).rejects.toThrow("Complete your profile");
    expect(requests.length).toBeGreaterThan(0);
    expect(
      requests.every(
        (request) => request.headers.get("Accept") !== "application/vnd.pgrst.object+json",
      ),
    ).toBe(true);
    expect(requests.every((request) => request.method === "GET")).toBe(true);
  });

  it.each(["manual", "completed-google"])(
    "creates a missing profile for %s without an initial 406",
    async (id) => {
      const result = await createSupabaseProfileRepo().ensureUserProfile({
        id,
        email: "alex@example.com",
        name: "alex_reyes",
        fullName: "Alex Reyes",
      });
      expect(result).toMatchObject({
        id,
        name: "alex_reyes",
        fullName: "Alex Reyes",
        role: "Guest",
      });
      expect(requests.filter((request) => request.method === "POST")).toHaveLength(1);
      expect(
        requests.every(
          (request) => request.headers.get("Accept") !== "application/vnd.pgrst.object+json",
        ),
      ).toBe(true);
    },
  );

  it("keeps legacy profile ID lookup working", async () => {
    rows = [{ id: "Legacy-ID", name: "alex", role: "Guest" }];
    expect(await createSupabaseProfileRepo().getProfile("legacy-id")).toMatchObject({
      id: "Legacy-ID",
      name: "alex",
    });
    expect(requests).toHaveLength(2);
  });

  it("does not mistake a database failure for a new account or attempt insertion", async () => {
    failRead = true;
    const repo = createSupabaseProfileRepo();
    await expect(repo.getProfile("new-user")).rejects.toThrow("Profile lookup unavailable");
    await expect(
      repo.ensureUserProfile({ id: "new-user", email: "alex@example.com", name: "alex" }),
    ).rejects.toThrow("Profile lookup unavailable");
    expect(requests.every((request) => request.method === "GET")).toBe(true);
  });
});
