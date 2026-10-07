"use client";

import { useState } from "react";
import { Check, X } from "lucide-react";
import { upsertContractor } from "@/lib/dataset";
import { useStore } from "@/lib/store";
import { contractorId } from "@/lib/types";

export type QuickAddMode = "type" | "contractor";

/**
 * Add a contractor without leaving Daily entry.
 *
 * A contractor type is not a record of its own — it exists only as a field on
 * a contractor — so creating a type asks for its first contractor in the same
 * breath. A type with nobody under it would vanish on reload.
 */
export default function QuickAdd({
  mode,
  presetType,
  onClose,
}: {
  mode: QuickAddMode;
  /** When adding inside an open type, that type is fixed. */
  presetType?: string;
  onClose: () => void;
}) {
  const { data } = useStore();
  const existingTypes = [...new Set(data.contractors.map((c) => c.type))].sort((a, b) =>
    a.localeCompare(b),
  );

  const [type, setType] = useState(mode === "contractor" ? (presetType ?? existingTypes[0] ?? "") : "");
  const [name, setName] = useState("");
  const [committed, setCommitted] = useState("");
  const [error, setError] = useState<string | null>(null);

  function submit() {
    const t = type.trim();
    const n = name.trim();
    if (!t) {
      setError("Contractor type is needed.");
      return;
    }
    if (!n) {
      setError("Contractor name is needed.");
      return;
    }
    if (committed.trim() === "") {
      setError("Committed headcount is needed.");
      return;
    }
    const c = Number(committed);
    if (!Number.isFinite(c) || c < 0) {
      setError("Committed must be a number.");
      return;
    }
    if (mode === "type" && existingTypes.some((x) => x.toLowerCase() === t.toLowerCase())) {
      setError(`"${t}" already exists. Use Add contractor to add to it.`);
      return;
    }
    const id = contractorId(t, n);
    if (data.contractors.some((x) => x.id === id)) {
      setError(`${n} is already on the roster under ${t}.`);
      return;
    }

    upsertContractor({ id, type: t, name: n, committed: Math.round(c) });
    onClose();
  }

  const fixedType = mode === "contractor" && presetType;

  return (
    <div className="mb-4 rounded-xl border border-hairline bg-surface-2 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-xs font-semibold text-ink">
            {mode === "type" ? "New contractor type" : "New contractor"}
          </h3>
          <p className="mt-0.5 text-xs text-ink-secondary">
            {mode === "type"
              ? "A type needs at least one contractor under it, so add the first one here."
              : "Added to the roster, and available to enter against straight away."}
          </p>
        </div>
        <button
          onClick={onClose}
          aria-label="Cancel"
          className="rounded-md p-1 text-ink-muted hover:text-ink"
        >
          <X size={14} strokeWidth={2.4} aria-hidden />
        </button>
      </div>

      <div className="mt-3 flex flex-wrap items-end gap-3">
        {!fixedType && (
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-medium text-ink-muted">Contractor type</span>
            {mode === "contractor" && existingTypes.length > 0 ? (
              <select value={type} onChange={(e) => setType(e.target.value)} className={field}>
                {existingTypes.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            ) : (
              <input
                value={type}
                onChange={(e) => setType(e.target.value)}
                placeholder="Fire Fighting"
                className={field}
              />
            )}
          </label>
        )}

        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-medium text-ink-muted">Contractor name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Prajapati"
            className={field}
            autoFocus
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-medium text-ink-muted">Committed</span>
          <input
            type="text"
            inputMode="numeric"
            value={committed}
            onChange={(e) => setCommitted(e.target.value.replace(/[^\d]/g, ""))}
            placeholder="10"
            className={`${field} tnum w-24 text-right`}
          />
        </label>

        <button
          onClick={submit}
          className="flex items-center gap-1.5 rounded-lg bg-series-1 px-3.5 py-2 text-xs font-semibold text-white"
        >
          <Check size={14} strokeWidth={2.6} aria-hidden />
          {mode === "type" ? "Create type" : "Add contractor"}
        </button>
      </div>

      {fixedType && (
        <p className="mt-2 text-xs text-ink-muted">
          Adding to <span className="font-medium text-ink-secondary">{presetType}</span>.
        </p>
      )}
      {error && <p className="mt-2 text-xs text-[var(--critical)]">{error}</p>}
    </div>
  );
}

const field =
  "rounded-md border border-hairline bg-surface-1 px-2.5 py-1.5 text-xs text-ink " +
  "placeholder:text-ink-muted focus:border-series-1 focus:outline-none focus:ring-1 focus:ring-series-1";
