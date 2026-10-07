"use client";

import { useState } from "react";
import { Check, X } from "lucide-react";
import { upsertContractor } from "@/lib/dataset";
import { useStore } from "@/lib/store";
import { contractorId } from "@/lib/types";

/**
 * Add a contractor without leaving Daily entry.
 *
 * The type field takes an existing type or a new one typed in, which is how a
 * new type gets created: a contractor type is not a record of its own, it
 * exists only as a field on a contractor, so a type with nobody under it
 * would not survive a reload.
 */
export default function QuickAdd({
  presetType,
  onClose,
}: {
  /** When adding inside an open type, that type is fixed. */
  presetType?: string;
  onClose: () => void;
}) {
  const { data } = useStore();
  const existingTypes = [...new Set(data.contractors.map((c) => c.type))].sort((a, b) =>
    a.localeCompare(b),
  );

  const [type, setType] = useState(presetType ?? "");
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
    const id = contractorId(canonical ?? t, n);
    if (data.contractors.some((x) => x.id === id)) {
      setError(`${n} is already on the roster under ${t}.`);
      return;
    }

    upsertContractor({ id, type: canonical ?? t, name: n, committed: Math.round(c) });
    onClose();
  }

  const fixedType = Boolean(presetType);

  // Typing a type that already exists, in any casing, should land on it
  // rather than create a near-duplicate beside it.
  const canonical = existingTypes.find((x) => x.toLowerCase() === type.trim().toLowerCase());
  const isNewType = type.trim() !== "" && !canonical;

  return (
    <div className="mb-4 rounded-xl border border-hairline bg-surface-2 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-xs font-semibold text-ink">New contractor</h3>
          <p className="mt-0.5 text-xs text-ink-secondary">
            Added to the roster, and available to enter against straight away. Type a new
            contractor type to create one.
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
            {/* A combobox, not a select: picking an existing type and naming a
                new one are the same gesture. */}
            <input
              list="quickadd-types"
              value={type}
              onChange={(e) => setType(e.target.value)}
              placeholder="Electrical"
              className={field}
            />
            <datalist id="quickadd-types">
              {existingTypes.map((t) => (
                <option key={t} value={t} />
              ))}
            </datalist>
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
          className="flex items-center gap-1.5 rounded-lg bg-accent px-3.5 py-2 text-xs font-semibold text-white"
        >
          <Check size={14} strokeWidth={2.6} aria-hidden />
          Add contractor
        </button>
      </div>

      {fixedType ? (
        <p className="mt-2 text-xs text-ink-muted">
          Adding to <span className="font-medium text-ink-secondary">{presetType}</span>.
        </p>
      ) : isNewType ? (
        <p className="mt-2 text-xs text-ink-muted">
          <span className="font-medium text-ink-secondary">{type.trim()}</span> is a new
          contractor type — it will be created with this contractor.
        </p>
      ) : null}
      {error && <p className="mt-2 text-xs text-[var(--critical)]">{error}</p>}
    </div>
  );
}

const field =
  "rounded-md border border-hairline bg-surface-1 px-2.5 py-1.5 text-xs text-ink " +
  "placeholder:text-ink-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent";
