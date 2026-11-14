import type { Mention, Profile } from "../data/types";

/** The @query immediately before the caret; supports full usernames. */
export function findMentionQuery(text: string, cursor: number) {
  const match = /(?:^|[\s(])@([^@\r\n]*)$/u.exec(text.slice(0, cursor));
  return match ? { query: match[1], start: cursor - match[1].length - 1 } : null;
}

export function suggestMentionProfiles(profiles: Profile[], query: string): Profile[] {
  const q = query.trim().toLocaleLowerCase();
  const unique = new Map<string, Profile>();
  for (const profile of profiles) {
    const key = profile.name.trim().toLocaleLowerCase();
    if (key && !unique.has(key)) unique.set(key, profile);
  }
  const score = (profile: Profile) => {
    const name = profile.name.toLocaleLowerCase();
    return name === q ? 0 : name.startsWith(q) ? 1 : name.includes(q) ? 2 : 3;
  };
  return [...unique.values()]
    .filter((profile) => !q || score(profile) < 3)
    .sort((a, b) => score(a) - score(b) || a.name.localeCompare(b.name))
    .slice(0, 8);
}

/** Match whole mentions, preferring longer names and ignoring email addresses. */
export function mentionPattern(names: string[]): RegExp | null {
  const escaped = [...new Set(names.filter(Boolean))]
    .sort((a, b) => b.length - a.length)
    .map((name) => name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  return escaped.length
    ? new RegExp(`(?<![\\p{L}\\p{N}_@-])(@(?:${escaped.join("|")}))(?![\\p{L}\\p{N}_-])`, "giu")
    : null;
}

/** Freeze labels and identities when posting; existing bindings win when editing. */
export function captureMentions(
  text: string,
  profiles: Profile[],
  previous: Mention[] = [],
): Mention[] {
  const byName = new Map<string, Mention>();
  for (const p of profiles) byName.set(p.name.toLowerCase(), { name: p.name, userId: p.id });
  for (const mention of previous) byName.set(mention.name.toLowerCase(), mention);
  const pattern = mentionPattern([...byName.values()].map((m) => m.name));
  if (!pattern) return [];
  const found = new Map<string, Mention>();
  for (const match of text.matchAll(pattern)) {
    const name = match[0].slice(1);
    const mention = byName.get(name.toLowerCase())!;
    found.set(name.toLowerCase(), { name, userId: mention.userId });
  }
  return [...found.values()];
}

/** Extract collaborator profile IDs using the same whole-name matching rules. */
export function extractMentionIds(text: string, profiles: Profile[]): string[] {
  return [...new Set(captureMentions(text, profiles).map((m) => m.userId))];
}
