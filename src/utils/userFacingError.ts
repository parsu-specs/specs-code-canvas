const fallback = "Something went wrong. Please try again.";

// Only reviewed messages may pass through. Never display arbitrary server text,
// even when it looks like a readable sentence.
const safeMessages = new Set([
  "Google sign-in failed. Try again.",
  "That Google sign-in was invalid. Try again.",
  "Could not check display name availability. Try again.",
  "Could not send reset email.",
  "Could not set password.",
  "Could not save password.",
  "Could not save changes.",
  "Could not save profile.",
  "Could not load projects.",
  "Could not load project.",
  "Could not load profile.",
  "Could not load comments.",
  "Could not load likes.",
  "Could not load updates.",
  "Could not post comment.",
  "Could not post reply.",
  "Could not post update.",
  "Could not publish project.",
  "Could not delete. Try again.",
  "Could not delete project.",
  "Could not read that file.",
  "Could not read those images.",
  "Could not like. Try again.",
  "Could not save like. Try again.",
  "Complete the human check first.",
  "Human check failed to load. Check your connection and reload the page.",
  "Checking display name availability…",
  "That email and password don't match.",
  "Enter a valid email address.",
  "Name is required.",
  "Display name is required.",
  "That display name is already taken. Pick another.",
  "That display name is already taken. Try another.",
  "That display name is already taken. Try signing in instead.",
  "That name is already taken by another developer.",
  "That email is already registered. Sign in instead.",
  "Password must be at least 6 characters.",
  "You are not signed in.",
  "Title is required.",
  "Description is required.",
  "Title and description are required.",
  "Role is required.",
  "Keep your name under 40 characters.",
  "Keep the project name under 80 characters.",
  "Keep the description under 280 characters.",
  "Keep documentation under 50000 characters.",
  "Keep role under 80 characters.",
  "Keep bio under 280 characters.",
  "Keep comments under 500 characters.",
  "Keep updates under 280 characters.",
  "Comment cannot be empty.",
  "Update cannot be empty.",
  "That comment no longer exists.",
  "This comment has been deleted.",
  "Project not found.",
  "Developer not found.",
  "Comment not found.",
  "Update not found.",
  "Images are too large. Pick smaller files.",
  "Could not upload images. Please try again.",
  "Could not process that image.",
  "Storage is full. Remove an image and try again.",
  "That file is empty. Pick a file with content.",
  "That doesn't look like a text file. Pick a Markdown or README file.",
  "That is a media file. Pick a Markdown or text file instead.",
  "That file is too big. Keep it under 200KB.",
  "No file selected.",
  "Pick a valid avatar color.",
  "Pick a valid profile theme.",
  "Pick a valid website palette.",
  ...["edit", "delete", "link"].map((action) => `You can only ${action} your own projects.`),
  "You can only edit your own profile.",
  "You can only delete your own comments.",
  "You can only delete your own updates.",
]);

export function userFacingError(error: unknown, defaultMessage = fallback): string {
  const message = error instanceof Error ? error.message : typeof error === "string" ? error : "";
  const legacyMessages: Record<string, string> = {
    "Could not vote. Try again.": "Could not like. Try again.",
    "Could not save vote. Try again.": "Could not save like. Try again.",
    "Could not load voters.": "Could not load likes.",
  };
  if (legacyMessages[message]) return legacyMessages[message];
  if (safeMessages.has(message)) return message;
  if (
    message === "App link must start with http(s)://." ||
    message === "Repo link must start with http(s)://."
  ) {
    return "Enter a valid link starting with https:// or http://.";
  }
  if (message === "Invalid login credentials") return "That email and password don't match.";
  if (message === "Email not confirmed") return "Confirm your email before signing in.";
  if (message === "Password reset emails aren't available in the local demo.") {
    return "Password reset is unavailable in this demo.";
  }
  if (/^(?:Voting|Liking) is paused — \d+:\d{2} left\.$/.test(message))
    return message.replace("Voting", "Liking");
  if (/^Spamming detected — (?:voting|liking) is paused for \d+:\d{2}\.$/.test(message)) {
    return "Liking is temporarily paused. Please wait before liking again.";
  }
  if (/^(?:Voting|Liking) is paused for another \d+ minutes?\. Try again later\.$/.test(message)) {
    return "Liking is temporarily paused. Please try again later.";
  }
  if (/failed to fetch|network request failed|networkerror|load failed/i.test(message)) {
    return "We couldn't connect. Check your internet connection and try again.";
  }
  return defaultMessage;
}
