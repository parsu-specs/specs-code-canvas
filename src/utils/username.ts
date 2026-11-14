export const USERNAME_PATTERN = "[A-Za-z0-9][A-Za-z0-9_\\-]{1,28}[A-Za-z0-9]";
export const USERNAME_HELP =
  "Use 3–30 letters, numbers, underscores or hyphens. Start and end with a letter or number.";
export const USERNAME_ERROR =
  "Use 3–30 characters: letters, numbers, underscores or hyphens, starting and ending with a letter or number.";

export function isValidUsername(value: string): boolean {
  return new RegExp(`^(?:${USERNAME_PATTERN})$`).test(value);
}

export function validateUsername(value: string): string {
  const name = value.trim();
  if (!isValidUsername(name)) throw new Error(USERNAME_ERROR);
  return name;
}

/** Escape SQL LIKE metacharacters so underscores are literal username characters. */
export function usernamePattern(value: string): string {
  return value.replace(/[\\%_]/g, "\\$&");
}
