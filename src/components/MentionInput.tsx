import { Button } from "./Button";
import React, { useId, useMemo, useRef, useState } from "react";
import Avatar from "./Avatar";
import Input, { Textarea } from "./Input";
import type { Profile } from "../data/types";
import { findMentionQuery, suggestMentionProfiles } from "../utils/mentions";

type MentionInputProps = {
  value: string;
  onChange: (value: string) => void;
  profiles: Profile[];
  placeholder?: string;
  maxLength?: number;
  required?: boolean;
  className?: string;
  multiline?: boolean;
  autoFocus?: boolean;
  ariaLabel?: string;
  trailingAction?: React.ReactNode;
  suggestionsPlacement?: "above" | "below";
};

/** Shared input or textarea with @developer autocomplete (filters as you type). */
export default function MentionInput({
  value,
  onChange,
  profiles,
  placeholder,
  maxLength,
  required,
  className,
  multiline = false,
  autoFocus,
  ariaLabel,
  trailingAction,
  suggestionsPlacement = "below",
}: MentionInputProps) {
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlight, setHighlight] = useState(0);
  const [anchor, setAnchor] = useState<number | null>(null);
  const mentionCursor = useRef(value.length);
  const inputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fieldRef = multiline ? textareaRef : inputRef;

  const suggestions = useMemo(() => suggestMentionProfiles(profiles, query), [profiles, query]);

  // The list shrinks as you type; never point past its end.
  const activeIndex = suggestions.length ? Math.min(highlight, suggestions.length - 1) : 0;

  const syncMention = (text: string, cursor: number | null | undefined) => {
    if (cursor === null || cursor === undefined) {
      setOpen(false);
      return;
    }
    mentionCursor.current = cursor;
    const match = findMentionQuery(text, cursor);
    if (match) {
      const queryLower = match.query.toLocaleLowerCase();
      const completed = profiles.some((p) =>
        queryLower.startsWith(`${p.name.toLocaleLowerCase()} `),
      );
      const stillSearching = profiles.some((p) =>
        p.name.toLocaleLowerCase().startsWith(queryLower),
      );
      if (completed && !stillSearching) {
        setOpen(false);
        return;
      }
      setQuery(match.query);
      setAnchor(match.start);
      setHighlight(0);
      setOpen(true);
    } else {
      setOpen(false);
    }
  };

  const complete = (name: string) => {
    const cursor = mentionCursor.current;
    const start = anchor ?? cursor;
    const suffix = value.slice(cursor);
    const separator = suffix && /^[\s.,!?;:)\]}]/u.test(suffix) ? "" : " ";
    const next = `${value.slice(0, start)}@${name}${separator}${suffix}`;
    if (maxLength !== undefined && next.length > maxLength) return;
    onChange(next);
    setOpen(false);
    requestAnimationFrame(() => {
      fieldRef.current?.focus();
      const pos = start + name.length + 1 + separator.length;
      fieldRef.current?.setSelectionRange(pos, pos);
    });
  };

  const fieldProps = {
    value,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      onChange(e.target.value);
      syncMention(e.target.value, e.target.selectionStart);
    },
    onClick: (e: React.MouseEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      syncMention(value, e.currentTarget.selectionStart),
    onKeyUp: (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      if (["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key))
        syncMention(value, e.currentTarget.selectionStart);
    },
    onKeyDown: (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      if (e.nativeEvent.isComposing) return;
      if (!open) return;
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        setOpen(false);
        return;
      }
      if (suggestions.length === 0) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setHighlight((h) => (h + 1) % suggestions.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlight((h) => (h - 1 + suggestions.length) % suggestions.length);
      } else if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        complete(suggestions[activeIndex].name);
      }
    },
    onBlur: () => {
      window.setTimeout(() => setOpen(false), 120);
    },
    placeholder,
    maxLength,
    required,
    autoComplete: "off",
    autoFocus,
    "aria-label": ariaLabel,
    role: "combobox",
    "aria-autocomplete": "list" as const,
    "aria-expanded": open,
    "aria-controls": open ? listId : undefined,
    "aria-activedescendant": open && suggestions.length ? `${listId}-${activeIndex}` : undefined,
    className,
  };

  return (
    <span className="relative block">
      {multiline ? (
        <Textarea {...fieldProps} ref={textareaRef} />
      ) : (
        <Input {...fieldProps} ref={inputRef} />
      )}
      {trailingAction && (
        <span className="absolute right-1.5 top-1/2 -translate-y-1/2">{trailingAction}</span>
      )}
      {open && (
        <ul
          id={listId}
          role="listbox"
          aria-label="Developer suggestions"
          className={`scrollbar-minimal absolute inset-x-0 z-30 max-h-64 overflow-y-auto rounded-xl border-[3px] border-outline bg-surface p-1.5 shadow-[4px_4px_0_var(--color-outline)] ${suggestionsPlacement === "above" ? "bottom-full mb-1" : "top-full mt-1"}`}
        >
          {suggestions.map((p, i) => (
            <li id={`${listId}-${i}`} key={p.id} role="option" aria-selected={i === activeIndex}>
              <Button
                variant="plain"
                type="button"
                tabIndex={-1}
                onPointerDown={(e) => {
                  e.preventDefault();
                }}
                onClick={() => complete(p.name)}
                onMouseEnter={() => setHighlight(i)}
                className={`min-w-0 flex w-full items-center gap-2 rounded-xl px-2 py-1.5 text-left text-sm font-black ${i === activeIndex ? "bg-secondary" : ""} max-w-full`}
              >
                <Avatar name={p.name} color={p.color} imageUrl={p.imageUrl} size="sm" />
                <span className="min-w-0">
                  <span className="block truncate">{p.name}</span>
                  <span className="block truncate text-xs font-bold text-muted">{p.role}</span>
                </span>
              </Button>
            </li>
          ))}
          {suggestions.length === 0 && (
            <li role="presentation" className="px-2 py-1.5 text-sm font-bold text-muted">
              No users found.
            </li>
          )}
        </ul>
      )}
    </span>
  );
}
