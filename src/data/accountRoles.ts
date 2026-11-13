/** Admin access belongs to the separate console's admins table. */
export type AccountRole = "Guest" | "Member";

/** Legacy job titles never imply administrator approval. */
export function accountRole(role: string | null | undefined): AccountRole {
  return role?.trim().toLowerCase() === "member" ? "Member" : "Guest";
}

export function canSubmitProjects(profile: { role: string } | null | undefined): boolean {
  return accountRole(profile?.role) === "Member";
}

export const MEMBERSHIP_REQUIRED =
  "An admin must approve your account as a Member before you can submit projects.";

export function rejectRolePatch(patch: object): void {
  if ("role" in patch) throw new Error("Account roles can only be changed in the admin console.");
}
