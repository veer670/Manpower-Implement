"use client";

import { ArrowDown, ArrowUp } from "lucide-react";

export type SortDir = "asc" | "desc";

/**
 * One sortable column label, with an arrow when it is the column in force.
 *
 * The lists and the entry form lay their columns out differently, so the
 * caller positions this with `className` — it only owns the label and arrow.
 */
export default function SortHeader({
  label,
  active,
  dir,
  onSort,
  className = "",
}: {
  label: string;
  active: boolean;
  dir: SortDir;
  onSort: () => void;
  className?: string;
}) {
  const Arrow = dir === "asc" ? ArrowUp : ArrowDown;
  return (
    <button
      onClick={onSort}
      aria-label={`Sort by ${label}`}
      className={`flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider transition-colors ${
        active ? "text-ink" : "text-ink-muted hover:text-ink-secondary"
      } ${className}`}
    >
      {label}
      {active && <Arrow size={11} strokeWidth={2.6} aria-hidden />}
    </button>
  );
}
