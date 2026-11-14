import { validateUsername } from "./username";
import type { ProfileRepo } from "../data/repositories";

/** Check availability before asking the user to release their current name. */
export async function confirmDisplayNameChange(
  repo: ProfileRepo,
  profile: { id: string; name: string },
  nextName: string,
  confirm: (message: string) => boolean | Promise<boolean>,
): Promise<boolean> {
  const name = nextName.trim();
  if (!name) throw new Error("Username is required.");
  if (name.length > 40) throw new Error("Keep your name under 40 characters.");
  if (name === profile.name) return true;
  validateUsername(name);

  const existing = await repo.getProfileByName(name);
  if (existing && existing.id !== profile.id) {
    throw new Error("That username is already taken. Try another.");
  }
  if (name.toLowerCase() === profile.name.trim().toLowerCase()) return true;

  return confirm(
    `Change your username to “${name}”? Your current username, “${profile.name}”, will become available for others to take.`,
  );
}
