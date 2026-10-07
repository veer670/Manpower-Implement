"use client";

import { useState } from "react";
import { ChevronRight, Trash2, TriangleAlert } from "lucide-react";
import { num } from "@/lib/format";
import type { OrderedName } from "@/lib/metrics";
import SrNoInput from "./SrNoInput";
import EditableName, { EditButton } from "./EditableName";

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
  /** What else goes with it, named in the confirmation. */
  deleteNote?: (name: string) => string;
  emptyMessage: string;
}) {
  const [confirming, setConfirming] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-hairline py-12 text-center">
        <p className="text-sm text-ink-muted">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {items.map((item, i) => {
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
            <div
              className="flex shrink-0 items-center pl-3"
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
            </div>

            <div className="flex min-w-0 flex-1 items-center gap-2 px-3 py-3">
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
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect(name);
                }}
                aria-label={`Open ${name}`}
                title={`Open ${name}`}
                className="shrink-0 rounded-md p-1.5 text-ink-muted transition-transform hover:bg-surface-2 group-hover:translate-x-0.5 group-hover:text-ink"
              >
                <ChevronRight size={17} strokeWidth={2.2} aria-hidden />
              </button>
            </div>

            {(onRename || onDelete) && (
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
  );
}
