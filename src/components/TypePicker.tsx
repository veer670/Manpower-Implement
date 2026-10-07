"use client";

import { ChevronRight } from "lucide-react";

/**
 * The first level of both Daily entry and Roster: contractor types, one per
 * row. Deliberately just the names — the figures belong inside a type, not
 * on the way to it.
 */
export default function TypePicker({
  types,
  onSelect,
  emptyMessage,
}: {
  types: string[];
  onSelect: (type: string) => void;
  emptyMessage: string;
}) {
  if (types.length === 0) {
    return <p className="py-10 text-center text-sm text-ink-muted">{emptyMessage}</p>;
  }

  return (
    <ul className="divide-y divide-hairline/60 border-y border-hairline/60">
      {types.map((type) => (
        <li key={type}>
          <button
            onClick={() => onSelect(type)}
            className="group flex w-full items-center justify-between gap-3 px-1 py-3.5 text-left transition-colors hover:bg-surface-2"
          >
            <span className="truncate text-sm font-semibold text-ink">{type}</span>
            <ChevronRight
              size={16}
              strokeWidth={2.2}
              className="shrink-0 text-ink-muted transition-colors group-hover:text-ink"
              aria-hidden
            />
          </button>
        </li>
      ))}
    </ul>
  );
}
