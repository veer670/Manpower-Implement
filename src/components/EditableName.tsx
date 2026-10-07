"use client";

import { useState } from "react";
import { Check, Pencil, X } from "lucide-react";

/**
 * A card title that can be renamed in place.
 *
 * Renaming is deliberately two-step — click the pencil, then confirm — because
 * on this roster a name is an identity: saved manpower and logins are keyed to
 * it, and a stray keystroke in an always-live field would quietly move them.
 */
export default function EditableName({
  value,
  label,
  onRename,
  className = "",
}: {
  value: string;
  /** What is being renamed, for the accessible name. */
  label: string;
  /** Return false to reject — a clash with an existing name, say. */
  onRename: (next: string) => boolean;
  className?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [error, setError] = useState(false);

  function start() {
    setDraft(value);
    setError(false);
    setEditing(true);
  }

  function commit() {
    const next = draft.trim();
    if (next === "" || next === value) {
      setEditing(false);
      return;
    }
    if (onRename(next)) setEditing(false);
    else setError(true);
  }

  if (editing) {
    return (
      <span className="flex min-w-0 flex-1 items-center gap-1.5">
        <input
          autoFocus
          value={draft}
          aria-label={`Rename ${label}`}
          aria-invalid={error}
          onChange={(e) => {
            setDraft(e.target.value);
            setError(false);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            if (e.key === "Escape") setEditing(false);
          }}
          onClick={(e) => e.stopPropagation()}
          className={`min-w-0 flex-1 rounded-lg border bg-surface-1 px-2.5 py-1.5 text-[15px] font-semibold text-ink focus:outline-none focus:ring-2 ${
            error
              ? "border-[var(--critical)] focus:ring-[var(--critical)]/30"
              : "border-accent focus:ring-accent/30"
          }`}
        />
        <button
          onClick={(e) => {
            e.stopPropagation();
            commit();
          }}
          aria-label="Save name"
          title="Save"
          className="rounded-md p-1.5 text-ink-secondary hover:bg-surface-2 hover:text-ink"
        >
          <Check size={14} strokeWidth={2.6} aria-hidden />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setEditing(false);
          }}
          aria-label="Cancel rename"
          title="Cancel"
          className="rounded-md p-1.5 text-ink-muted hover:bg-surface-2 hover:text-ink"
        >
          <X size={14} strokeWidth={2.6} aria-hidden />
        </button>
        {error && (
          <span className="whitespace-nowrap text-xs text-[var(--critical)]">
            That name is taken
          </span>
        )}
      </span>
    );
  }

  return (
    <span className={`flex min-w-0 flex-1 items-center gap-1.5 ${className}`}>
      <span className="min-w-0 truncate text-[15px] font-semibold text-ink">{value}</span>
      <button
        onClick={(e) => {
          e.stopPropagation();
          start();
        }}
        aria-label={`Rename ${label}`}
        title={`Rename ${label}`}
        className="shrink-0 rounded-md p-1 text-ink-muted opacity-0 transition-opacity hover:bg-surface-2 hover:text-ink focus:opacity-100 group-hover:opacity-100"
      >
        <Pencil size={13} strokeWidth={2.2} aria-hidden />
      </button>
    </span>
  );
}
