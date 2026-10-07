"use client";

import { ChevronRight, Users } from "lucide-react";
import { num, pct } from "@/lib/format";
import StatusChip from "./StatusChip";

export type TypeCard = {
  type: string;
  contractors: number;
  committed: number;
  /** Entry mode only — omit on the roster, where there is nothing reported. */
  reported?: number;
  entered?: number;
  fillRate?: number | null;
};

/**
 * The first level of both Daily entry and Roster: pick a contractor type,
 * then work inside it. Keeps a long roster down to a handful of choices
 * before any table appears.
 */
export default function TypePicker({
  cards,
  onSelect,
  emptyMessage,
}: {
  cards: TypeCard[];
  onSelect: (type: string) => void;
  emptyMessage: string;
}) {
  if (cards.length === 0) {
    return <p className="py-10 text-center text-sm text-ink-muted">{emptyMessage}</p>;
  }

  return (
    <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {cards.map((c) => {
        const entryMode = c.reported !== undefined;
        const complete = entryMode && c.entered === c.contractors;
        return (
          <li key={c.type}>
            <button
              onClick={() => onSelect(c.type)}
              className="group flex w-full items-center gap-3 rounded-xl border border-hairline bg-surface-1 p-4 text-left transition-colors hover:border-series-1/40 hover:bg-surface-2"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-ink-secondary group-hover:bg-surface-1">
                <Users size={16} strokeWidth={2} aria-hidden />
              </span>

              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-ink">{c.type}</span>
                <span className="mt-0.5 block text-xs text-ink-secondary">
                  {num(c.contractors)} contractor{c.contractors === 1 ? "" : "s"} ·{" "}
                  {num(c.committed)} committed
                </span>

                {entryMode && (
                  <span className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="tnum text-xs font-medium text-ink">
                      {num(c.reported as number)} reported
                    </span>
                    <span className="tnum text-xs text-ink-secondary">{pct(c.fillRate ?? null, 0)}</span>
                    {complete ? (
                      <StatusChip rate={c.fillRate ?? null} />
                    ) : (
                      <span className="text-xs text-ink-muted">
                        {num(c.entered ?? 0)} of {num(c.contractors)} entered
                      </span>
                    )}
                  </span>
                )}
              </span>

              <ChevronRight
                size={16}
                strokeWidth={2.2}
                className="shrink-0 text-ink-muted group-hover:text-ink-secondary"
                aria-hidden
              />
            </button>
          </li>
        );
      })}
    </ul>
  );
}
