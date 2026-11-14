import { describe, expect, it } from "vitest";
import {
  captureMentions,
  extractMentionIds,
  findMentionQuery,
  suggestMentionProfiles,
} from "./mentions";
import type { Profile } from "../data/types";

const profile = (name: string, id = name): Profile => ({
  id,
  name,
  role: "Developer",
  color: "sky",
  bio: "",
  createdAt: "2026-10-21",
});

describe("mention search", () => {
  it("opens on @ and supports spaces, digits, underscores, and Unicode", () => {
    for (const query of ["", "Jay Romero", "jay_23", "José", "李明"]) {
      const text = `Hello @${query}`;
      expect(findMentionQuery(text, text.length)).toEqual({ query, start: 6 });
    }
  });

  it("searches the latest mention at the caret without treating email as a mention", () => {
    expect(findMentionQuery("hi @Jay and @Jo tomorrow", 15)).toEqual({ query: "Jo", start: 12 });
    expect(findMentionQuery("hello jay@example.com", 21)).toBeNull();
    expect(findMentionQuery("hello", 5)).toBeNull();
  });

  it("ranks exact matches before prefixes and substrings and removes duplicate profiles", () => {
    const profiles = [
      profile("XJay"),
      profile("Jay Romero"),
      profile("Jay"),
      profile("jay", "alias"),
      profile("Other"),
    ];
    expect(suggestMentionProfiles(profiles, "jAy").map((p) => p.name)).toEqual([
      "Jay",
      "Jay Romero",
      "XJay",
    ]);
    expect(suggestMentionProfiles(profiles, "missing")).toEqual([]);
  });

  it("limits the initial user list to eight suggestions", () => {
    expect(
      suggestMentionProfiles(
        Array.from({ length: 12 }, (_, i) => profile(`User ${i}`)),
        "",
      ),
    ).toHaveLength(8);
  });
});

describe("permanent mention bindings", () => {
  it("treats hyphens and underscores as part of the username", () => {
    const profiles = [profile("alex"), profile("alex-reyes"), profile("alex_reyes")];
    expect(captureMentions("@alex-unknown @alex_other @alex-reyes @alex_reyes", profiles)).toEqual([
      { name: "alex-reyes", userId: "alex-reyes" },
      { name: "alex_reyes", userId: "alex_reyes" },
    ]);
  });
  it("retains the original user after rename and name reuse, including description edits", () => {
    const saved = captureMentions("Built with @Alice", [profile("Alice", "original")]);
    const current = [profile("Alicia", "original"), profile("Alice", "new-owner")];
    expect(captureMentions("Built with @Alice and @Alicia!", current, saved)).toEqual([
      { name: "Alice", userId: "original" },
      { name: "Alicia", userId: "original" },
    ]);
    expect(captureMentions("Mention removed", current, saved)).toEqual([]);
  });

  it("captures whole names, punctuation and original casing without matching emails", () => {
    const profiles = [profile("Bob"), profile("Bob Smith"), profile("A+B")];
    expect(captureMentions("@bob smith helped @A+B; x@Bob.com @Bobcat", profiles)).toEqual([
      { name: "bob smith", userId: "Bob Smith" },
      { name: "A+B", userId: "A+B" },
    ]);
    expect(extractMentionIds("Thanks @Bob Smith for helping", profiles)).toEqual(["Bob Smith"]);
  });
});
