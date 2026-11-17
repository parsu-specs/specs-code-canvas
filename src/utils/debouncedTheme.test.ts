import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { Profile } from "../data/types";
import { createDebouncedTheme } from "./debouncedTheme";

const profile: Profile = {
  id: "u1",
  name: "Member",
  role: "Guest",
  bio: "",
  color: "sky",
  createdAt: "2026-11-17",
};
beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

it("combines palette and mode changes 500 ms after the last selection", async () => {
  const save = vi.fn().mockResolvedValue(profile);
  const queue = createDebouncedTheme(save);
  const first = queue.schedule("u1", { palette: "ocean" });
  await vi.advanceTimersByTimeAsync(400);
  const second = queue.schedule("u1", { appearance: "dark" });
  const third = queue.schedule("u1", { palette: "forest", appearance: "light" });
  await vi.advanceTimersByTimeAsync(499);
  expect(save).not.toHaveBeenCalled();
  expect(queue.pending()).toEqual({ palette: "forest", appearance: "light" });
  await vi.advanceTimersByTimeAsync(1);
  await Promise.all([first, second, third]);
  expect(save).toHaveBeenCalledExactlyOnceWith("u1", { palette: "forest", appearance: "light" });
  expect(queue.hasPending()).toBe(false);
});

it("serializes slow saves and preserves newer pending choices", async () => {
  let finish!: (value: Profile) => void;
  const save = vi
    .fn()
    .mockImplementationOnce(
      () =>
        new Promise<Profile>((resolve) => {
          finish = resolve;
        }),
    )
    .mockResolvedValue(profile);
  const queue = createDebouncedTheme(save);
  const first = queue.schedule("u1", { palette: "ocean", appearance: "dark" });
  await vi.advanceTimersByTimeAsync(500);
  const second = queue.schedule("u1", { appearance: "light" });
  await vi.advanceTimersByTimeAsync(500);
  expect(save).toHaveBeenCalledOnce();
  expect(queue.pending()).toEqual({ palette: "ocean", appearance: "light" });
  finish(profile);
  await Promise.all([first, second]);
  expect(save).toHaveBeenCalledTimes(2);
  expect(save).toHaveBeenLastCalledWith("u1", { appearance: "light" });
});

it("cancels unsent saves and ignores responses after session cancellation", async () => {
  let finish!: (value: Profile) => void;
  const save = vi.fn().mockImplementation(
    () =>
      new Promise<Profile>((resolve) => {
        finish = resolve;
      }),
  );
  const queue = createDebouncedTheme(save);
  const unsent = queue.schedule("u1", { appearance: "dark" });
  queue.cancel();
  await vi.advanceTimersByTimeAsync(500);
  expect(await unsent).toBeUndefined();
  expect(save).not.toHaveBeenCalled();
  const sent = queue.schedule("u1", { appearance: "light" });
  await vi.advanceTimersByTimeAsync(500);
  queue.cancel();
  finish(profile);
  expect(await sent).toBeUndefined();
  expect(queue.hasPending()).toBe(false);
});

it("reports failed saves and allows the next selection to save", async () => {
  const save = vi.fn().mockRejectedValueOnce(new Error("Offline")).mockResolvedValue(profile);
  const queue = createDebouncedTheme(save);
  const failed = expect(queue.schedule("u1", { palette: "ocean" })).rejects.toThrow("Offline");
  await vi.advanceTimersByTimeAsync(500);
  await failed;
  const retry = queue.schedule("u1", { palette: "forest" });
  await vi.advanceTimersByTimeAsync(500);
  expect(await retry).toEqual(profile);
  expect(save).toHaveBeenCalledTimes(2);
});
