/** Full names are presentation only; usernames remain the unique identity. */
export function validateFullName(value: string): string {
  const name = value.trim();
  if (!name) throw new Error("Full name is required.");
  if (name.length > 100) throw new Error("Keep your full name under 100 characters.");
  return name;
}
