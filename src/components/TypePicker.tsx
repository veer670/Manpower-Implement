"use client";

import { useState } from "react";
import { ChevronRight, Trash2, TriangleAlert } from "lucide-react";
import { num } from "@/lib/format";
import { initialsOf } from "./Table";

/**
 * The first level of both Daily entry and Roster: contractor types, one card
 * per row. Deliberately just the names — the figures belong inside a type,
 * not on the way to it.
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
    return (
      <div className="rounded-xl border border-dashed border-hairline py-12 text-center">
        <p className="text-sm text-ink-muted">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {types.map((type, i) => {
        const srNo = i + 1;

        if (confirming === type) {
          const count = countFor?.(type) ?? 0;
          return (
            <li
              key={type}
              className="rounded-xl border border-[var(--critical)]/30 bg-surface-2 p-4"
            >
              <div className="flex gap-2.5">
                <TriangleAlert
                  size={16}
                  strokeWidth={2.2}
                  style={{ color: "var(--critical)" }}
                  className="mt-0.5 shrink-0"
                  aria-hidden
                />
                <div>
                  {/* Spelled out, because this takes the saved manpower with it. */}
                  <p className="text-sm font-semibold text-ink">Delete {type}?</p>
                  <p className="mt-0.5 text-xs text-ink-secondary">
                    {count > 0
                      ? `This removes ${num(count)} contractor${count === 1 ? "" : "s"} and every manpower figure saved against ${count === 1 ? "it" : "them"}. It cannot be undone.`
                      : "It cannot be undone."}
                  </p>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2 pl-[26px]">
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
          <li
            key={type}
            className="group flex items-stretch overflow-hidden rounded-xl border border-hairline bg-surface-1 transition-all hover:border-series-1/35 hover:bg-surface-2"
          >
            <button
              onClick={() => onSelect(type)}
              className="flex min-w-0 flex-1 items-center gap-3.5 px-4 py-3.5 text-left"
            >
              <span className="tnum w-5 shrink-0 text-xs font-medium text-ink-muted">{srNo}</span>

              <span
                aria-hidden
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-[11px] font-bold tracking-wide text-ink-secondary transition-colors group-hover:bg-surface-1 group-hover:text-ink"
              >
                {initialsOf(type)}
              </span>

              <span className="min-w-0 flex-1 truncate text-[15px] font-semibold text-ink">
                {type}
              </span>

              <ChevronRight
                size={17}
                strokeWidth={2.2}
                className="shrink-0 text-ink-muted transition-transform group-hover:translate-x-0.5 group-hover:text-ink"
                aria-hidden
              />
            </button>

            {onDelete && (
              <button
                onClick={() => setConfirming(type)}
                aria-label={`Delete the ${type} contractor type`}
                title={`Delete ${type}`}
                className="flex w-11 shrink-0 items-center justify-center border-l border-hairline/60 text-ink-muted transition-colors hover:bg-surface-1 hover:text-[var(--critical)]"
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
