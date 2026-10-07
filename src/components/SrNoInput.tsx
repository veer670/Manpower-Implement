"use client";

import { useState } from "react";

/**
 * An editable serial number.
 *
 * The figure typed in *is* the sort key — it does not renumber the rows
 * around it. Two rows may share a number, and ties break on name, so setting
 * one row's number never silently rewrites another's.
 */
export default function SrNoInput({
  value,
  placeholder,
  label,
  onChange,
}: {
  value: number | null;
  /** Shown greyed when nothing has been set, so the list still reads 1, 2, 3. */
  placeholder: number;
  /** What this numbers, for the accessible name. */
  label: string;
  /** Omit to render the number read-only. */
  onChange?: (srNo: number) => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const shown = draft ?? (value == null ? "" : String(value));

  if (!onChange) {
    return (
      <span className="tnum w-9 text-center text-xs font-medium text-ink-muted">
        {value ?? placeholder}
      </span>
    );
  }

  function commit() {
    const raw = (draft ?? "").trim();
    setDraft(null);
    if (raw === "") return;
    const n = Number(raw);
    if (!Number.isFinite(n) || n < 0) return;
    if (n !== value) onChange?.(Math.round(n));
  }

  return (
    <input
      type="text"
      inputMode="numeric"
      aria-label={`Serial number for ${label}`}
      value={shown}
      placeholder={String(placeholder)}
      onChange={(e) => {
        const v = e.target.value;
        if (v === "" || /^\d{0,4}$/.test(v)) setDraft(v);
      }}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
        if (e.key === "Escape") {
          setDraft(null);
          e.currentTarget.blur();
        }
      }}
      className="tnum w-9 rounded-md border border-transparent bg-transparent px-1 py-1 text-center text-xs font-medium text-ink-secondary placeholder:text-ink-muted hover:border-hairline hover:bg-surface-2 focus:border-accent focus:bg-surface-1 focus:text-ink focus:outline-none focus:ring-2 focus:ring-accent/30"
    />
  );
}
