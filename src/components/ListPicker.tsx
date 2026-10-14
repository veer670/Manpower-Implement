"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, ChevronRight, Trash2, TriangleAlert } from "lucide-react";
import { num } from "@/lib/format";
import type { OrderedName } from "@/lib/metrics";
import SrNoInput from "./SrNoInput";
import EditableName, { EditButton } from "./EditableName";

type SortKey = "srNo" | "name" | "committed" | "reported";
type Sort = { key: SortKey; dir: "asc" | "desc" };

/**
 * One level of the roster drill-down: categories, or the types inside one.
 * Both levels look and behave the same, so they share this.
 */
export default function ListPicker({
  items,
  onSelect,
  onDelete,
  onSrNo,
  onRename,
  countFor,
  statsFor,
  deleteNote,
  emptyMessage,
}: {
  items: OrderedName[];
  onSelect: (name: string) => void;
  /** Omit to hide the delete control entirely. */
  onDelete?: (name: string) => void;
  /** Omit to make the serial number read-only. */
  onSrNo?: (name: string, srNo: number) => void;
  /** Omit to make the name read-only. Return false to reject a clash. */
  onRename?: (from: string, to: string) => boolean;
  /** How many contractors sit under this item, for the confirmation wording. */
  countFor?: (name: string) => number;
  /** The day's figures for this item. Omit to show none. */
  statsFor?: (name: string) => { committed: number; reported: number } | null;
  /** What else goes with it, named in the confirmation. */
  deleteNote?: (name: string) => string;
  emptyMessage: string;
}) {
  const [confirming, setConfirming] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [sort, setSort] = useState<Sort>({ key: "srNo", dir: "asc" });

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-hairline py-12 text-center">
        <p className="text-sm text-ink-muted">{emptyMessage}</p>
      </div>
    );
  }

  const hasStats = Boolean(statsFor);
  const hasActions = Boolean(onRename || onDelete);

  // Sr. No. ascending is the order the caller already handed over, so leave it
  // alone; everything else re-sorts here. Not memoised on purpose — statsFor is
  // a fresh closure on every parent render, so a memo keyed on it never hits.
  const ordered =
    sort.key === "srNo" && sort.dir === "asc"
      ? items
      : [...items].sort((a, b) => {
          let cmp: number;
          if (sort.key === "name") {
            cmp = a.name.localeCompare(b.name);
          } else if (sort.key === "srNo") {
            // Unset serial numbers sink to the bottom rather than reading as 0.
            cmp = (a.srNo ?? Number.MAX_SAFE_INTEGER) - (b.srNo ?? Number.MAX_SAFE_INTEGER);
          } else {
            cmp = (statsFor?.(a.name)?.[sort.key] ?? 0) - (statsFor?.(b.name)?.[sort.key] ?? 0);
          }
          return sort.dir === "asc" ? cmp : -cmp;
        });

  const toggle = (key: SortKey) =>
    setSort((s) =>
      s.key === key
        ? { key, dir: s.dir === "asc" ? "desc" : "asc" }
        : // A column of figures is opened to find the big numbers; a column of
          // names or serials to find a place in the list.
          { key, dir: key === "committed" || key === "reported" ? "desc" : "asc" },
    );

  return (
    <div>
      {/* Sort controls, sitting over the columns they sort. */}
      {items.length > 1 && (
        <div className="mb-2 hidden items-center px-3 sm:flex">
          <Header label="Sr." sortKey="srNo" sort={sort} onSort={toggle} className="w-11 shrink-0" />
          <Header
            label="Name"
            sortKey="name"
            sort={sort}
            onSort={toggle}
            className="min-w-0 flex-1"
          />
          {hasStats && (
            <>
              <Header
                label="Committed"
                sortKey="committed"
                sort={sort}
                onSort={toggle}
                className="w-24 justify-center"
              />
              <Header
                label="Reported"
                sortKey="reported"
                sort={sort}
                onSort={toggle}
                className="w-24 justify-center"
              />
              <span className="flex-1" />
            </>
          )}
          <span className="w-10 shrink-0" />
          {hasActions && <span className="w-[66px] shrink-0" />}
        </div>
      )}

      <ul className="space-y-2">
        {ordered.map((item, i) => {
          const name = item.name;

          if (confirming === name) {
            const count = countFor?.(name) ?? 0;
            return (
              <li
                key={name}
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
                    <p className="text-sm font-semibold text-ink">Delete {name}?</p>
                    <p className="mt-0.5 text-xs text-ink-secondary">
                      {deleteNote?.(name) ??
                        (count > 0
                          ? `This removes ${num(count)} contractor${
                              count === 1 ? "" : "s"
                            } and every manpower figure saved against ${
                              count === 1 ? "it" : "them"
                            }. It cannot be undone.`
                          : "It cannot be undone.")}
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-2 pl-[26px]">
                  <button
                    onClick={() => {
                      onDelete?.(name);
                      setConfirming(null);
                    }}
                    className="flex items-center gap-1.5 rounded-lg bg-[var(--critical)] px-3 py-1.5 text-xs font-semibold text-white"
                  >
                    <Trash2 size={13} strokeWidth={2.4} aria-hidden />
                    Delete {name}
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

          const stats = statsFor?.(name);

          return (
            <li
              key={name}
              onClick={() => {
                // Clicking anywhere on the card opens it — except while its own
                // name is being edited, where a stray click would discard the edit.
                if (editing !== name) onSelect(name);
              }}
              className="group flex cursor-pointer items-stretch overflow-hidden rounded-xl border border-hairline bg-surface-1 transition-colors hover:border-accent/45 hover:bg-surface-2/60"
            >
              <div className="flex min-w-0 flex-1 items-center py-3 pl-3">
                <span
                  className="flex w-11 shrink-0 items-center"
                  onClick={(e) => e.stopPropagation()}
                >
                  <SrNoInput
                    value={item.srNo}
                    // Falls back to position when nothing has been set, so the
                    // list still reads 1, 2, 3 before anyone edits it.
                    placeholder={i + 1}
                    label={name}
                    onChange={onSrNo ? (v) => onSrNo(name, v) : undefined}
                  />
                </span>

                <span className="flex min-w-0 flex-1 items-center pr-3">
                  {onRename ? (
                    <EditableName
                      key={`${name}:${editing === name}`}
                      value={name}
                      label={name}
                      editing={editing === name}
                      onCancel={() => setEditing(null)}
                      onRename={(to) => onRename(name, to)}
                    />
                  ) : (
                    <span className="min-w-0 flex-1 truncate text-[15px] font-semibold text-ink">
                      {name}
                    </span>
                  )}
                </span>

                {hasStats && (
                  <>
                    <Figure label="committed" value={stats?.committed ?? 0} />
                    <Figure label="reported" value={stats?.reported ?? 0} />
                    {/* Holds the figures in the middle of the row rather than
                        letting them drift out to the right-hand edge. */}
                    <span className="hidden flex-1 sm:block" />
                  </>
                )}

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelect(name);
                  }}
                  aria-label={`Open ${name}`}
                  title={`Open ${name}`}
                  className="mx-1 shrink-0 rounded-md p-1.5 text-ink-muted transition-transform hover:bg-surface-2 group-hover:translate-x-0.5 group-hover:text-ink"
                >
                  <ChevronRight size={17} strokeWidth={2.2} aria-hidden />
                </button>
              </div>

              {hasActions && (
                <div
                  className="flex w-[66px] shrink-0 items-center justify-center gap-0.5 border-l border-hairline/60"
                  onClick={(e) => e.stopPropagation()}
                >
                  {onRename && <EditButton label={name} onClick={() => setEditing(name)} />}
                  {onDelete && (
                    <button
                      onClick={() => setConfirming(name)}
                      aria-label={`Delete ${name}`}
                      title={`Delete ${name}`}
                      className="rounded-md p-1.5 text-ink-muted hover:bg-surface-2 hover:text-[var(--critical)]"
                    >
                      <Trash2 size={14} strokeWidth={2.2} aria-hidden />
                    </button>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** One sortable column label, with an arrow when it is the one in force. */
function Header({
  label,
  sortKey,
  sort,
  onSort,
  className = "",
}: {
  label: string;
  sortKey: SortKey;
  sort: Sort;
  onSort: (key: SortKey) => void;
  className?: string;
}) {
  const active = sort.key === sortKey;
  const Arrow = sort.dir === "asc" ? ArrowUp : ArrowDown;
  return (
    <button
      onClick={() => onSort(sortKey)}
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

/** A figure on a list row: the value over the word, both centred in a column. */
function Figure({ label, value }: { label: string; value: number }) {
  return (
    <span className="hidden w-24 shrink-0 text-center sm:block">
      <span className="tnum block text-sm font-semibold leading-none text-ink">{num(value)}</span>
      <span className="mt-1 block text-[10px] text-ink-muted">{label}</span>
    </span>
  );
}
