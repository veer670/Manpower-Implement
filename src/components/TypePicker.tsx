"use client";

import { useState } from "react";
import { ChevronRight, Trash2 } from "lucide-react";
import { num } from "@/lib/format";

/**
 * The first level of both Daily entry and Roster: contractor types, one per
 * row. Deliberately just the names — the figures belong inside a type, not
 * on the way to it.
 */
export default function TypePicker({
  types,
  onSelect,
  onDelete,
  countFor,
  emptyMessage,
}: {
  types: string[];
  onSelect: (type: string) => void;
  /** Omit to hide the delete control entirely. */
  onDelete?: (type: string) => void;
  /** How many contractors a type holds, for the confirmation wording. */
  countFor?: (type: string) => number;
  emptyMessage: string;
}) {
  const [confirming, setConfirming] = useState<string | null>(null);

  if (types.length === 0) {
    return <p className="py-10 text-center text-sm text-ink-muted">{emptyMessage}</p>;
  }

  return (
    <ul className="divide-y divide-hairline/60 border-y border-hairline/60">
      {types.map((type, i) => {
        const srNo = i + 1;

        if (confirming === type) {
          const count = countFor?.(type) ?? 0;
          return (
            <li key={type} className="bg-surface-2 px-3 py-3">
              {/* Spelled out, because this takes the saved manpower with it. */}
              <p className="text-sm text-ink">
                Delete <span className="font-semibold">{type}</span>?
              </p>
              <p className="mt-0.5 text-xs text-ink-secondary">
                {count > 0
                  ? `This removes ${num(count)} contractor${count === 1 ? "" : "s"} and every manpower figure saved against ${count === 1 ? "them" : "them"}. It cannot be undone.`
                  : "It cannot be undone."}
              </p>
              <div className="mt-3 flex items-center gap-2">
                <button
                  onClick={() => {
                    onDelete?.(type);
                    setConfirming(null);
                  }}
                  className="flex items-center gap-1.5 rounded-lg bg-[var(--critical)] px-3 py-1.5 text-xs font-semibold text-white"
                >
                  <Trash2 size={13} strokeWidth={2.4} aria-hidden />
                  Delete {type}
                </button>
                <button
                  onClick={() => setConfirming(null)}
                  className="rounded-lg border border-hairline bg-surface-1 px-3 py-1.5 text-xs font-semibold text-ink-secondary hover:text-ink"
                >
                  Cancel
                </button>
              </div>
            </li>
          );
        }

        return (
          <li key={type} className="group flex items-center transition-colors hover:bg-surface-2">
            <button
              onClick={() => onSelect(type)}
              className="flex min-w-0 flex-1 items-center gap-3 px-3 py-3.5 text-left"
            >
              <span className="tnum w-6 shrink-0 text-xs text-ink-muted">{srNo}</span>
              <span className="min-w-0 flex-1 truncate text-sm font-semibold text-ink">{type}</span>
              <ChevronRight
                size={16}
                strokeWidth={2.2}
                className="shrink-0 text-ink-muted transition-colors group-hover:text-ink"
                aria-hidden
              />
            </button>

            {onDelete && (
              <button
                onClick={() => setConfirming(type)}
                aria-label={`Delete the ${type} contractor type`}
                title={`Delete ${type}`}
                className="mr-2 rounded-md p-2 text-ink-muted hover:bg-surface-1 hover:text-[var(--critical)]"
              >
                <Trash2 size={14} strokeWidth={2.2} aria-hidden />
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
}
