import type { ProfilePatch } from "../data/repositories";
import type { Profile } from "../data/types";

export type ThemePatch = Pick<ProfilePatch, "palette" | "appearance">;
type Waiter = { resolve: (profile: Profile | undefined) => void; reject: (error: unknown) => void };
type Batch = { userId: string; patch: ThemePatch; waiters: Waiter[] };

/** One trailing save for both theme controls; serialize slow writes. */
export function createDebouncedTheme(
  save: (userId: string, patch: ThemePatch) => Promise<Profile>,
) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let queued: Batch | undefined;
  let running: Batch | undefined;
  let ready = false;

  const flush = async () => {
    if (!ready || !queued || running) return;
    const batch = queued;
    queued = undefined;
    running = batch;
    ready = false;
    try {
      const profile = await save(batch.userId, batch.patch);
      if (running === batch) {
        running = undefined;
        batch.waiters.forEach(({ resolve }) => resolve(profile));
      }
    } catch (error) {
      if (running === batch) {
        running = undefined;
        batch.waiters.forEach(({ reject }) => reject(error));
      }
    } finally {
      if (!running) void flush();
    }
  };

  const cancel = () => {
    clearTimeout(timer);
    queued?.waiters.forEach(({ resolve }) => resolve(undefined));
    running?.waiters.forEach(({ resolve }) => resolve(undefined));
    queued = undefined;
    running = undefined;
    ready = false;
  };

  return {
    schedule(userId: string, patch: ThemePatch): Promise<Profile | undefined> {
      if ((queued && queued.userId !== userId) || (running && running.userId !== userId)) cancel();
      clearTimeout(timer);
      ready = false;
      queued ??= { userId, patch: {}, waiters: [] };
      Object.assign(queued.patch, patch);
      const batch = queued;
      const promise = new Promise<Profile | undefined>((resolve, reject) => {
        batch.waiters.push({ resolve, reject });
      });
      timer = setTimeout(() => {
        ready = true;
        void flush();
      }, 5_000);
      return promise;
    },
    pending(): ThemePatch {
      return { ...running?.patch, ...queued?.patch };
    },
    hasPending: () => Boolean(queued || running),
    cancel,
  };
}
