"use client";

import { useState } from "react";
import { Check, Pencil, X } from "lucide-react";

/**
 * A card title that can be renamed in place.
 *
 * Editing is controlled by the parent, because the pencil that starts it lives
 * in the card's action strip beside delete rather than next to the name.
 */
export default function EditableName({
  value,
  label,
  editing,
  onCancel,
  onRename,
}: {
  value: string;
  /** What is being renamed, for the accessible name. */
  label: string;
  editing: boolean;
  onCancel: () => void;
  /** Return false to reject — a clash with an existing name, say. */
  onRename: (next: string) => boolean;
}) {
  const [draft, setDraft] = useState(value);
  const [error, setError] = useState(false);

  // Remounted by the parent's `key` when editing starts, so the draft seeds
  // from the current value without an effect.
  if (!editing) {
    return (
      <span className="min-w-0 flex-1 truncate text-[15px] font-semibold text-ink">{value}</span>
    );
  }

  function commit() {
    const next = draft.trim();
    if (next === "" || next === value) {
      onCancel();
      return;
    }
    if (onRename(next)) onCancel();
    else setError(true);
  }

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
          if (e.key === "Escape") onCancel();
        }}
        onClick={(e) => e.stopPropagation()}
        className={`min-w-0 flex-1 rounded-lg border bg-surface-1 px-2.5 py-1.5 text-[15px] font-semibold text-ink focus:outline-none focus:ring-2 ${
          error
            ? "border-[var(--critical)] focus:ring-[var(--critical)]/30"
            : "border-accent focus:ring-accent/30"
        }`}
      />
      <button
        onClick={commit}
        aria-label="Save name"
        title="Save"
        className="shrink-0 rounded-md p-1.5 text-ink-secondary hover:bg-surface-2 hover:text-ink"
      >
        <Check size={14} strokeWidth={2.6} aria-hidden />
      </button>
      <button
        onClick={onCancel}
        aria-label="Cancel rename"
        title="Cancel"
        className="shrink-0 rounded-md p-1.5 text-ink-muted hover:bg-surface-2 hover:text-ink"
      >
        <X size={14} strokeWidth={2.6} aria-hidden />
      </button>
      {error && (
        <span className="whitespace-nowrap text-xs text-[var(--critical)]">That name is taken</span>
      )}
    </span>
  );
}

/** The control that starts a rename, sized to sit beside DeleteButton. */
export function EditButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-label={`Rename ${label}`}
      title={`Rename ${label}`}
      className="rounded-md p-1.5 text-ink-muted hover:bg-surface-2 hover:text-ink"
    >
      <Pencil size={14} strokeWidth={2.2} aria-hidden />
    </button>
  );
}
