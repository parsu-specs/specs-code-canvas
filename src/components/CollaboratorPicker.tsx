import { Button } from "./Button";
import React, { useMemo, useState } from "react";
import { MagnifyingGlass, X } from "@phosphor-icons/react";
import Avatar from "./Avatar";
import Input from "./Input";
import type { Profile } from "../data/types";

type CollaboratorPickerProps = {
  profiles: Profile[];
  selected: string[];
  onChange: (selected: string[]) => void;
};

/** Search developers, click to add, and remove selected collaborators using their chips. */
export default function CollaboratorPicker({
  profiles,
  selected,
  onChange,
}: CollaboratorPickerProps) {
  const [filter, setFilter] = useState("");
  const selectedSet = useMemo(() => new Set(selected), [selected]);

  const unique = useMemo(() => {
    const seen = new Map<string, Profile>();
    for (const p of profiles) {
      const key = p.name.toLowerCase();
      if (!seen.has(key)) seen.set(key, p);
    }
    return [...seen.values()];
  }, [profiles]);

  const q = filter.trim().toLowerCase();
  const matches = unique
    .filter((p) => !selectedSet.has(p.id) && (!q || p.name.toLowerCase().includes(q)))
    .sort((a, b) => {
      const rank = (p: Profile) => (!q ? 1 : p.name.toLowerCase().startsWith(q) ? 0 : 1);
      return rank(a) - rank(b) || a.name.localeCompare(b.name);
    })
    .slice(0, 8);

  const toggle = (id: string) => {
    onChange(selectedSet.has(id) ? selected.filter((x) => x !== id) : [...selected, id]);
  };

  const selectedProfiles = selected
    .map((id) => unique.find((p) => p.id === id))
    .filter((p): p is Profile => Boolean(p));

  return (
    <div className="rounded-2xl border-[3px] border-outline bg-surface p-3">
      {selectedProfiles.length > 0 && (
        <div className="min-w-0 mb-2 flex flex-wrap gap-2 max-w-full">
          {selectedProfiles.map((p) => (
            <span
              key={p.id}
              className="min-w-0 inline-flex items-center gap-1.5 rounded-full border-2 border-outline bg-secondary py-0.5 pl-0.5 pr-1.5 text-xs font-black max-w-full"
            >
              <Avatar name={p.name} color={p.color} imageUrl={p.imageUrl} size="sm" />
              <span className="min-w-0 wrap-anywhere">{p.name}</span>
              <Button
                variant="plain"
                type="button"
                onClick={() => toggle(p.id)}
                aria-label={`Remove ${p.name} as collaborator`}
                className="rounded-full border border-outline bg-surface p-0.5"
              >
                <X size={12} weight="bold" />
              </Button>
            </span>
          ))}
        </div>
      )}
      <label className="relative block">
        <span className="sr-only">Search developers to add as collaborators</span>
        <MagnifyingGlass
          size={18}
          weight="bold"
          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted"
        />
        <Input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Search developers…"
          autoComplete="off"
          className="py-2 pl-10 text-sm"
          variant="ghost"
        />
      </label>
      <ul className="scrollbar-minimal mt-2 max-h-52 space-y-1 overflow-y-auto">
        {matches.map((p) => (
          <li key={p.id}>
            <Button
              variant="menu"
              type="button"
              onClick={() => toggle(p.id)}
              aria-label={`Add ${p.name} as collaborator`}
              className="min-h-11 gap-2"
            >
              <Avatar name={p.name} color={p.color} imageUrl={p.imageUrl} size="sm" />
              <span className="min-w-0">
                <span className="block truncate">{p.name}</span>
                <span className="block truncate text-xs font-bold text-muted">{p.role}</span>
              </span>
            </Button>
          </li>
        ))}
        {matches.length === 0 && (
          <li className="px-2 py-1.5 text-sm font-bold text-muted">No developers match.</li>
        )}
      </ul>
    </div>
  );
}
