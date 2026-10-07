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
  presetCategory,
  presetType,
  onClose,
}: {
  /** When adding inside an open category or type, those are fixed. */
  presetCategory?: string;
  presetType?: string;
  onClose: () => void;
}) {
  const { data } = useStore();
  const existingCategories = [...new Set(data.contractors.map((c) => c.category))].sort((a, b) =>
    a.localeCompare(b),
  );

  const [category, setCategory] = useState(presetCategory ?? "");
  const [type, setType] = useState(presetType ?? "");
  const [name, setName] = useState("");
  const [committed, setCommitted] = useState("");
  const [error, setError] = useState<string | null>(null);

  function submit() {
    const cat = category.trim();
    const t = type.trim();
    const n = name.trim();
    if (!cat) {
      setError("Category is needed.");
      return;
    }
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
    const cat2 = canonicalCategory ?? cat;
    const type2 = canonical ?? t;
    const id = contractorId(cat2, type2, n);
    if (data.contractors.some((x) => x.id === id)) {
      setError(`${n} is already on the roster under ${cat2} / ${type2}.`);
      return;
    }

    // Lands at the end of its type; the Sr. No. box reorders it afterwards.
    const srNo =
      data.contractors.filter((x) => x.category === cat2 && x.type === type2).length + 1;
    upsertContractor({
      id,
      category: cat2,
      type: type2,
      name: n,
      committed: Math.round(c),
      srNo,
    });
    onClose();
  }

  const fixedCategory = Boolean(presetCategory);
  const fixedType = Boolean(presetType);

  // Types already used under the chosen category, for the datalist.
  const existingTypes = [
    ...new Set(
      data.contractors
        .filter((c) => c.category.toLowerCase() === category.trim().toLowerCase())
        .map((c) => c.type),
    ),
  ].sort((a, b) => a.localeCompare(b));

  const canonicalCategory = existingCategories.find(
    (x) => x.toLowerCase() === category.trim().toLowerCase(),
  );
  const isNewCategory = category.trim() !== "" && !canonicalCategory;

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
            category or contractor type to create one.
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
        {!fixedCategory && (
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-medium text-ink-muted">Category</span>
            <input
              list="quickadd-categories"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="MEP"
              className={field}
            />
            <datalist id="quickadd-categories">
              {existingCategories.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </label>
        )}

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

      {fixedType || fixedCategory ? (
        <p className="mt-2 text-xs text-ink-muted">
          Adding to{" "}
          <span className="font-medium text-ink-secondary">
            {[presetCategory, presetType].filter(Boolean).join(" / ")}
          </span>
          .
        </p>
      ) : null}
      {(isNewCategory || isNewType) && (
        <p className="mt-2 text-xs text-ink-muted">
          <span className="font-medium text-ink-secondary">
            {[isNewCategory ? category.trim() : null, isNewType ? type.trim() : null]
              .filter(Boolean)
              .join(" / ")}
          </span>{" "}
          {isNewCategory && isNewType ? "are new" : "is new"} — created with this contractor.
        </p>
      )}
      {error && <p className="mt-2 text-xs text-[var(--critical)]">{error}</p>}
    </div>
  );
}

const field =
  "rounded-md border border-hairline bg-surface-1 px-2.5 py-1.5 text-xs text-ink " +
  "placeholder:text-ink-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent";
